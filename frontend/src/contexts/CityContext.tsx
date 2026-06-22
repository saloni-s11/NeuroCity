import React, { createContext, useContext, useEffect, useState } from "react";

type CityContextType = {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
};

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CITIES = [
  "Mumbai",
  "Pune",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Ahmedabad",
  "Kolkata",
];

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<string>("Mumbai");

  useEffect(() => {
    const saved = localStorage.getItem("selectedCity");
    if (saved && CITIES.includes(saved)) {
      setSelectedCityState(saved);
    }
  }, []);

  const setSelectedCity = (city: string) => {
    setSelectedCityState(city);
    localStorage.setItem("selectedCity", city);
  };

  return (
    <CityContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
}
