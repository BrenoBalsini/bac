export type Lifeguard = {
  id: string;
  name: string;
  group: "G1" | "G2";
  rank: number;
  postPreferences?: string[];
};
