import { MongoClient } from "mongodb";
import dns from "dns";
const dbName = process.env.MONGODB_DB ?? "bizboost";
type GlobalThisWithMongo = typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
};
const globalForMongo = globalThis as GlobalThisWithMongo;
let warnedAboutNodeVersion = false;
let dnsFallbackApplied = false;
function isDnsLookupFailure(error: unknown): boolean {
    const message = error instanceof Error ? error.message : "";
    const code = error instanceof Error && "code" in error
        ? String((error as {
            code?: string;
        }).code ?? "")
        : "";
    return (code === "ECONNREFUSED" ||
        code === "ENOTFOUND" ||
        code === "EAI_AGAIN" ||
        message.includes("querySrv") ||
        message.includes("ENOTFOUND") ||
        message.includes("EAI_AGAIN"));
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
    const clientOptions = {
        appName: "Cluster0",
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
    };
    const connectWithRetry = async () => {
        const client = new MongoClient(getMongoUri(), clientOptions);
        try {
            return await client.connect();
        }
        catch (error: unknown) {
            if (!dnsFallbackApplied && isDnsLookupFailure(error)) {
                dnsFallbackApplied = true;
                dns.setServers(["1.1.1.1", "8.8.8.8"]);
                console.warn("[MongoDB] Retrying Atlas connection via public DNS servers (1.1.1.1, 8.8.8.8).");
                return new MongoClient(getMongoUri(), clientOptions).connect();
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
