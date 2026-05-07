export type BusinessProfile = {
    businessName: string;
    businessType: string;
    country: string;
    city: string;
    language: string;
};
const STORAGE_KEY = "bizboost_business";
export function saveBusinessProfile(data: BusinessProfile): void {
    if (typeof window === "undefined")
        return;
    console.log("Business data saved", data);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export function loadBusinessProfile(): BusinessProfile | null {
    if (typeof window === "undefined")
        return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw) as BusinessProfile;
    }
    catch {
        return null;
    }
}
