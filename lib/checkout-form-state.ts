export type CheckoutFormState = {
  status: "idle" | "error";
  message: string;
  // Echoed back so the form can be re-filled: React clears uncontrolled
  // fields after every action, which would otherwise wipe what the user typed.
  values: { name: string; phone: string; messenger: string; comment: string; seats: string };
};

export const initialCheckoutFormState: CheckoutFormState = {
  status: "idle",
  message: "",
  values: { name: "", phone: "", messenger: "", comment: "", seats: "1" },
};
