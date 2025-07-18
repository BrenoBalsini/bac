export type Shift = {
  lifeguardId: string;
  postId: string;
  date: string;
};

export type Schedule = {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  shifts: Shift[];
};
