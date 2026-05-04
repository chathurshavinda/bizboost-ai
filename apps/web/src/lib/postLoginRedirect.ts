type BusinessProfileGetResponse = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

type PostLoginRouteResult = {
  route: "/dashboard/profile" | "/onboarding/business-details";
};

export async function resolvePostLoginRoute(firebaseUid: string): Promise<PostLoginRouteResult> {
  try {
    const query = new URLSearchParams({ firebase_uid: firebaseUid });
    const response = await fetch(`/api/business-profile?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    const result = (await response.json()) as BusinessProfileGetResponse;

    if (response.ok && result.ok && result.data) {
      return { route: "/dashboard/profile" };
    }

    return { route: "/onboarding/business-details" };
  } catch {
    return { route: "/onboarding/business-details" };
  }
}
