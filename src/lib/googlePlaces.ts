export interface AddressParts {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface AddressPrediction {
  placeId: string;
  description: string;
}

const GOOGLE_SCRIPT_ID = 'google-maps-places-sdk';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

let googleMapsLoadPromise: Promise<void> | null = null;
let autocompleteService: any | null = null;
let geocoderService: any | null = null;
let placesDetailsService: any | null = null;

function getWindowGoogle() {
  return (window as any).google;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

function toCountryCode(input?: string): string | undefined {
  if (!input) return undefined;
  const normalized = input.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'usa' || normalized === 'united states' || normalized === 'united states of america') return 'us';
  if (normalized.length === 2) return normalized;
  return undefined;
}

function normalizeCountry(longName?: string, shortName?: string): string | undefined {
  const short = shortName?.toUpperCase();
  if (short === 'US') return 'USA';
  return longName || shortName;
}

function extractAddressParts(addressComponents: any[] | undefined): AddressParts {
  if (!addressComponents || !addressComponents.length) return {};

  const componentByType = (type: string) => addressComponents.find((comp) => comp.types?.includes(type));
  const streetNumber = componentByType('street_number')?.long_name || '';
  const route = componentByType('route')?.long_name || '';

  const city =
    componentByType('locality')?.long_name ||
    componentByType('postal_town')?.long_name ||
    componentByType('sublocality')?.long_name ||
    componentByType('administrative_area_level_2')?.long_name ||
    undefined;

  const state = componentByType('administrative_area_level_1')?.short_name || undefined;
  const postalCode = componentByType('postal_code')?.long_name || undefined;
  const country = normalizeCountry(
    componentByType('country')?.long_name,
    componentByType('country')?.short_name,
  );

  const street = [streetNumber, route].filter(Boolean).join(' ').trim() || undefined;

  return { street, city, state, postalCode, country };
}

async function loadGoogleMapsPlacesSdk(): Promise<void> {
  if (!GOOGLE_MAPS_API_KEY) return;

  if (getWindowGoogle()?.maps?.places) return;
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps Places SDK')));
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps Places SDK'));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

async function getAutocompleteService() {
  await loadGoogleMapsPlacesSdk();
  const google = getWindowGoogle();
  if (!google?.maps?.places) return null;
  if (!autocompleteService) autocompleteService = new google.maps.places.AutocompleteService();
  return autocompleteService;
}

async function getGeocoderService() {
  await loadGoogleMapsPlacesSdk();
  const google = getWindowGoogle();
  if (!google?.maps) return null;
  if (!geocoderService) geocoderService = new google.maps.Geocoder();
  return geocoderService;
}

async function getPlacesDetailsService() {
  await loadGoogleMapsPlacesSdk();
  const google = getWindowGoogle();
  if (!google?.maps?.places) return null;
  if (!placesDetailsService) {
    placesDetailsService = new google.maps.places.PlacesService(document.createElement('div'));
  }
  return placesDetailsService;
}

export async function fetchAddressPredictions(input: string, country?: string): Promise<AddressPrediction[]> {
  if (!isGooglePlacesConfigured()) return [];
  const query = input.trim();
  if (query.length < 3) return [];

  const service = await getAutocompleteService();
  if (!service) return [];

  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: query,
        types: ['address'],
        componentRestrictions: toCountryCode(country) ? { country: toCountryCode(country)! } : undefined,
      },
      (predictions: any[] | null, status: string) => {
        const google = getWindowGoogle();
        if (status !== google?.maps?.places?.PlacesServiceStatus?.OK || !predictions?.length) {
          resolve([]);
          return;
        }

        resolve(
          predictions.map((prediction) => ({
            placeId: prediction.place_id,
            description: prediction.description,
          })),
        );
      },
    );
  });
}

export async function fetchAddressByPlaceId(placeId: string): Promise<AddressParts | null> {
  if (!isGooglePlacesConfigured() || !placeId) return null;
  const service = await getPlacesDetailsService();
  if (!service) return null;

  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['address_components'],
      },
      (place: any, status: string) => {
        const google = getWindowGoogle();
        if (status !== google?.maps?.places?.PlacesServiceStatus?.OK || !place?.address_components) {
          resolve(null);
          return;
        }
        resolve(extractAddressParts(place.address_components));
      },
    );
  });
}

export async function fetchAddressByPostalCode(postalCode: string, country?: string): Promise<AddressParts | null> {
  if (!isGooglePlacesConfigured()) return null;
  const cleanPostal = postalCode.trim();
  if (cleanPostal.length < 3) return null;

  const geocoder = await getGeocoderService();
  if (!geocoder) return null;

  return new Promise((resolve) => {
    const query = country ? `${cleanPostal}, ${country}` : cleanPostal;
    geocoder.geocode({ address: query }, (results: any[] | null, status: string) => {
      const google = getWindowGoogle();
      if (status !== google?.maps?.GeocoderStatus?.OK || !results?.length) {
        resolve(null);
        return;
      }
      resolve(extractAddressParts(results[0].address_components));
    });
  });
}
