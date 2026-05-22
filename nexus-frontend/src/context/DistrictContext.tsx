"use client";

import { createContext, useContext, useState } from "react";
import { type District } from "@/lib/utils";

interface DistrictContextValue {
  district: District;
  setDistrict: (d: District) => void;
}

const DistrictContext = createContext<DistrictContextValue>({
  district: "Tamale Metro",
  setDistrict: () => {},
});

export function DistrictProvider({ children }: { children: React.ReactNode }) {
  const [district, setDistrict] = useState<District>("Tamale Metro");
  return (
    <DistrictContext.Provider value={{ district, setDistrict }}>
      {children}
    </DistrictContext.Provider>
  );
}

export function useDistrict() {
  return useContext(DistrictContext);
}
