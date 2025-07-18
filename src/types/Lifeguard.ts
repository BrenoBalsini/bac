export type Lifeguard = {
  id: string;
  name: string;
  group: "G1" | "G2";
  rank: number;
  preferenceA_id?: string;
  preferenceB_id?: string;
};
