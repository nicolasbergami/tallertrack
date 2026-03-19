import { api } from "./client";

export interface VehicleLookupResult {
  found: true;
  vehicle: {
    id: string;
    license_plate: string;
    brand: string;
    model: string;
    year: number | null;
    color: string | null;
    fuel_type: string | null;
    engine_cc: number | null;
    mileage_km: number | null;
    vin: string | null;
    notes: string | null;
    last_order_number: string | null;
    client: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
    };
  };
}

export interface VehicleNotFound {
  found: false;
}

export const vehiclesApi = {
  lookupByPlate: async (plate: string): Promise<VehicleLookupResult | VehicleNotFound> => {
    const encoded = encodeURIComponent(plate.toUpperCase().replace(/[\s\-]/g, ""));
    try {
      return await api.get<VehicleLookupResult>(`/vehicles/lookup?plate=${encoded}`);
    } catch (err: unknown) {
      // 404 means vehicle not found — not an error
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
        return { found: false };
      }
      throw err;
    }
  },
};
