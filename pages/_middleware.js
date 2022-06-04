import { NextRequest, NextResponse } from "next/server";
import { GrowthBook } from "@growthbook/growthbook";

const FEATURES_ENDPOINT = "FEATURE_API_ROOT/api/features/<api key>";

let features = null;
let lastFetch = 0;

async function getFeatures() {
  if (Date.now() - lastFetch > 5000) {
    lastFetch = Date.now();
    const latest = fetch(FEATURES_ENDPOINT)
      .then((res) => res.json())
      .then((json) => (features = json.features || features))
      .catch((e) => console.error("Error fetching features", e));
    // If this is the first time, wait for the initial fetch
    if (!features) await latest;
  }
  return features || {};
}

const COOKIE = "visitor_id";

export async function middleware(req, ev) {
  console.log("middleware");
  // Get existing visitor cookie or create a new one
  let visitor_id = req.cookies[COOKIE] || crypto.randomUUID();

  // Create a GrowthBook client instance
  const growthbook = new GrowthBook({
    attributes: { id: visitor_id },
    features: await getFeatures(),
    trackingCallback: (exp, res) => {
      console.log("In Experiment", exp.key, res.variationId);
    },
  });
  console.log(growthbook.feature("home").on);
  // Pick which page to render depending on a feature flag
  let res = NextResponse.next();
  if (growthbook.feature("home").on) {
    console.log("getFeatures");
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    res = NextResponse.rewrite(url);
  }

  // Store the visitor cookie if not already there
  if (!req.cookies[COOKIE]) {
    res.cookie(COOKIE, visitor_id);
  }

  return res;
}
