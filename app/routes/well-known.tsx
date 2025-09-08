import type { Route } from "./+types/well-known";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  
  // Handle Chrome DevTools endpoint
  if (url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  
  // Return 404 for other well-known endpoints
  throw new Response("Not Found", { status: 404 });
}

export default function WellKnown() {
  return null;
}