import { milesBetweenCoordinates } from "./travel";

export const ARRIVAL_GEOFENCE_RADIUS_MILES = 0.15;

export const isWithinArrivalGeofence = ({
  job,
  worker,
  radiusMiles = ARRIVAL_GEOFENCE_RADIUS_MILES,
}: {
  job: { latitude: number; longitude: number };
  radiusMiles?: number;
  worker: { latitude: number; longitude: number };
}) => milesBetweenCoordinates(job, worker) <= radiusMiles;
