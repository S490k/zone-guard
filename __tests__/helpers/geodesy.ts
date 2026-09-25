// Vincenty geodesics on the WGS-84 ellipsoid, used as an independent reference for
// the spherical Haversine implementation under test. Kept in the test tree rather
// than in `app/` deliberately: the app does not need ellipsoidal accuracy, but
// verifying the app's boundary behaviour does need a reference it cannot mark its
// own homework against.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const A = 6378137.0; // WGS-84 semi-major axis, metres
const F = 1 / 298.257223563; // flattening
const B = A * (1 - F); // semi-minor axis

/**
 * Direct problem: the point reached by travelling `metres` from (lat, lon) along
 * the geodesic with initial bearing `bearingDeg`.
 */
export function geodesicPoint(
  lat: number,
  lon: number,
  bearingDeg: number,
  metres: number
): { lat: number; lon: number } {
  const alpha1 = bearingDeg * D2R;
  const tanU1 = (1 - F) * Math.tan(lat * D2R);
  const cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1);
  const sinU1 = tanU1 * cosU1;
  const sigma1 = Math.atan2(tanU1, Math.cos(alpha1));
  const sinAlpha = cosU1 * Math.sin(alpha1);
  const cosSqAlpha = 1 - sinAlpha * sinAlpha;
  const uSq = (cosSqAlpha * (A * A - B * B)) / (B * B);
  const bigA = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const bigB = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

  let sigma = metres / (B * bigA);
  let sigmaPrev = Infinity;
  let cos2SigmaM = 0;
  let sinSigma = 0;
  let cosSigma = 0;

  for (let i = 0; i < 200 && Math.abs(sigma - sigmaPrev) > 1e-12; i++) {
    cos2SigmaM = Math.cos(2 * sigma1 + sigma);
    sinSigma = Math.sin(sigma);
    cosSigma = Math.cos(sigma);
    const dSigma =
      bigB *
      sinSigma *
      (cos2SigmaM +
        (bigB / 4) *
          (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
            (bigB / 6) *
              cos2SigmaM *
              (-3 + 4 * sinSigma * sinSigma) *
              (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    sigmaPrev = sigma;
    sigma = metres / (B * bigA) + dSigma;
  }

  const tmp = sinU1 * sinSigma - cosU1 * cosSigma * Math.cos(alpha1);
  const lat2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * Math.cos(alpha1),
    (1 - F) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)
  );
  const lambda = Math.atan2(
    sinSigma * Math.sin(alpha1),
    cosU1 * cosSigma - sinU1 * sinSigma * Math.cos(alpha1)
  );
  const bigC = (F / 16) * cosSqAlpha * (4 + F * (4 - 3 * cosSqAlpha));
  const L =
    lambda -
    (1 - bigC) *
      F *
      sinAlpha *
      (sigma +
        bigC * sinSigma * (cos2SigmaM + bigC * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));

  return { lat: lat2 * R2D, lon: lon + L * R2D };
}

/** Inverse problem: geodesic distance in metres between two points. */
export function geodesicDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const L = (lon2 - lon1) * D2R;
  const U1 = Math.atan((1 - F) * Math.tan(lat1 * D2R));
  const U2 = Math.atan((1 - F) * Math.tan(lat2 * D2R));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaPrev = Infinity;
  let sinSigma = 0;
  let cosSigma = 0;
  let sigma = 0;
  let cosSqAlpha = 0;
  let cos2SigmaM = 0;

  for (let i = 0; i < 200 && Math.abs(lambda - lambdaPrev) > 1e-12; i++) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2
    );
    if (sinSigma === 0) return 0; // coincident points
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;
    const C = (F / 16) * cosSqAlpha * (4 + F * (4 - 3 * cosSqAlpha));
    lambdaPrev = lambda;
    lambda =
      L +
      (1 - C) *
        F *
        sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  }

  const uSq = (cosSqAlpha * (A * A - B * B)) / (B * B);
  const bigA = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const bigB = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const dSigma =
    bigB *
    sinSigma *
    (cos2SigmaM +
      (bigB / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (bigB / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma * sinSigma) *
            (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  return bigA * B * (sigma - dSigma);
}

/** The eight cardinal and intercardinal bearings, in degrees. */
export const BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315];
