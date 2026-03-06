export interface Place {
  id: string;
  name: string;
  priority: number;
  category: string;
  cuisine: string;
  address: string;
  lat: number;
  lng: number;
  google_place_id: string;
  google_maps_url: string;
  source: string;
  list: string;
  notes: string;
  visited: boolean;
  date_added: string;
  screenshot_url: string;
  city: string;
}

export type NewPlace = Partial<Place> & Pick<Place, 'name'>;
