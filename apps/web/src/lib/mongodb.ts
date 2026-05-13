import { MongoClient } from "mongodb";
import dns from "dns";
const dbName = process.env.MONGODB_DB ?? "bizboost";
type GlobalThisWithMongo = typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
};
const globalForMongo = globalThis as GlobalThisWithMongo;
let warnedAboutNodeVersion = false;
let dnsFallbackApplied = false;
let dnsPrimedForAtlas = false;

/** Prefer public resolvers + IPv4 before Atlas SRV lookups (helps flaky ISP / Windows DNS). */
function primeDnsForMongoAtlas(): void {
    if (dnsPrimedForAtlas) return;
    if (process.env.MONGODB_SKIP_PUBLIC_DNS === "1") return;
    dnsPrimedForAtlas = true;
    try {
        dns.setServers(["1.1.1.1", "8.8.8.8", "1.0.0.1"]);
        if (typeof dns.setDefaultResultOrder === "function") {
            dns.setDefaultResultOrder("ipv4first");
        }
    }
    catch {
        // non-fatal
    }
}

function walkErrorChain(error: unknown, visit: (e: Error) => void): void {
    let current: unknown = error;
    const seen = new Set<unknown>();
    let depth = 0;
    while (current instanceof Error && depth < 8 && !seen.has(current)) {
        seen.add(current);
        visit(current);
        current = (current as Error & { cause?: unknown }).cause;
        depth += 1;
    }
}

function isDnsLookupFailure(error: unknown): boolean {
    const parts: string[] = [];
    walkErrorChain(error, (e) => {
        parts.push(e.message);
        const code = "code" in e ? String((e as { code?: string }).code ?? "") : "";
        if (code) parts.push(code);
    });
    const blob = parts.join(" ");
    return /ENOTFOUND|EAI_AGAIN|querySrv/i.test(blob);
}
function getMongoUri(): string {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI not found in .env.local");
    }
    if (!uri.startsWith("mongodb+srv://")) {
        throw new Error("MONGODB_URI must use mongodb+srv:// for Atlas");
    }
    if (!warnedAboutNodeVersion) {
        const majorVersion = Number(process.versions.node.split(".")[0]);
        if (!Number.isNaN(majorVersion) && majorVersion > 20) {
            console.warn("[MongoDB] Detected Node.js v" +
                process.versions.node +
                ". For Atlas TLS reliability, use Node.js 20 LTS.");
        }
        warnedAboutNodeVersion = true;
    }
    return uri;
}
export async function getClient(): Promise<MongoClient> {
    primeDnsForMongoAtlas();

    const clientOptions = {
        appName: "Cluster0",
        serverSelectionTimeoutMS: 12000,
        connectTimeoutMS: 12000,
    };
    const connectWithRetry = async () => {
        const client = new MongoClient(getMongoUri(), clientOptions);
        try {
            return await client.connect();
        }
        catch (error: unknown) {
            if (!dnsFallbackApplied && isDnsLookupFailure(error)) {
                dnsFallbackApplied = true;
                try {
                    dns.setServers(["8.8.4.4", "1.1.1.1", "8.8.8.8"]);
                }
                catch {
                    // ignore
                }
                console.warn("[MongoDB] Retrying Atlas connection with alternate DNS server order.");
                return new MongoClient(getMongoUri(), clientOptions).connect();
            }
            if (isDnsLookupFailure(error)) {
                console.error(
                    "[MongoDB] Cannot resolve Atlas hostnames (ENOTFOUND). Try: (1) ipconfig /flushdns on Windows, " +
                        "(2) another network or mobile hotspot, (3) Node.js 20 LTS, (4) confirm MONGODB_URI in Atlas → Connect.",
                );
            }
            throw error;
        }
    };
    if (process.env.NODE_ENV === "development") {
        if (!globalForMongo._mongoClientPromise) {
            globalForMongo._mongoClientPromise = connectWithRetry().catch((err: unknown) => {
                globalForMongo._mongoClientPromise = undefined;
                throw err;
            });
        }
        return globalForMongo._mongoClientPromise;
    }
    return connectWithRetry();
}
export async function getDb() {
    const client = await getClient();
    return client.db(dbName);
}
