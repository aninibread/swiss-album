export interface DatePickerState {
  month: number;
  year: number;
}

export interface LocationSuggestion {
  properties: {
    formatted?: string;
    name?: string;
  };
}

export interface MediaHighlight {
  url: string;
  uploader?: any;
  eventName: string;
  dayTitle: string;
  type: 'photo' | 'video';
}