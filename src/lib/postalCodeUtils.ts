// Canadian Postal Code Utilities
// Postal code format: A1A 1A1 (letter-number-letter space number-letter-number)
// Also accepts A1A1A1 (without space)

// Canadian postal code regex pattern - accepts both A1A 1A1 and A1A1A1 formats
export const CANADIAN_POSTAL_CODE_REGEX = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

// Format postal code to standard format (A1A 1A1)
// Automatically adds space if missing
export const formatPostalCode = (postalCode: string): string => {
  // Remove all spaces and convert to uppercase
  const cleaned = postalCode.replace(/\s/g, "").toUpperCase();
  
  // If we have exactly 6 characters, format with space
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  
  // For partial input, just uppercase it
  return postalCode.toUpperCase().slice(0, 7); // Max 7 chars (A1A 1A1)
};

// Validate Canadian postal code format
// Accepts both "A1A 1A1" and "A1A1A1" formats
export const isValidCanadianPostalCode = (postalCode: string): boolean => {
  const trimmed = postalCode.trim();
  // Accept both with and without space
  return CANADIAN_POSTAL_CODE_REGEX.test(trimmed);
};

// Office postal code (Belleville, ON)
export const OFFICE_POSTAL_CODE = "K8N 1A1";

// Deterministic hash function for stable coordinate variation
// Same postal code always produces same hash (no Math.random())
const hashPostalCode = (postalCode: string): number => {
  let hash = 0;
  for (let i = 0; i < postalCode.length; i++) {
    hash = ((hash << 5) - hash) + postalCode.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// More precise Ontario FSA coordinates (first 3 characters of postal code)
// This provides much better accuracy for Ontario coverage checks
const ontarioFSACoordinates: Record<string, { lat: number; lng: number; city: string }> = {
  // Toronto (M prefix - detailed by area)
  "M1B": { lat: 43.8060, lng: -79.1945, city: "Scarborough" },
  "M1C": { lat: 43.7845, lng: -79.1605, city: "Scarborough" },
  "M1E": { lat: 43.7636, lng: -79.1887, city: "Scarborough" },
  "M1G": { lat: 43.7709, lng: -79.2169, city: "Scarborough" },
  "M1H": { lat: 43.7635, lng: -79.2395, city: "Scarborough" },
  "M1J": { lat: 43.7448, lng: -79.2394, city: "Scarborough" },
  "M1K": { lat: 43.7279, lng: -79.2620, city: "Scarborough" },
  "M1L": { lat: 43.7111, lng: -79.2845, city: "Scarborough" },
  "M1M": { lat: 43.7163, lng: -79.2395, city: "Scarborough" },
  "M1N": { lat: 43.6927, lng: -79.2648, city: "Scarborough" },
  "M1P": { lat: 43.7574, lng: -79.2730, city: "Scarborough" },
  "M1R": { lat: 43.7500, lng: -79.2956, city: "Scarborough" },
  "M1S": { lat: 43.7942, lng: -79.2620, city: "Scarborough" },
  "M1T": { lat: 43.7816, lng: -79.3045, city: "Scarborough" },
  "M1V": { lat: 43.8152, lng: -79.2845, city: "Scarborough" },
  "M1W": { lat: 43.7995, lng: -79.3183, city: "Scarborough" },
  "M1X": { lat: 43.8361, lng: -79.2057, city: "Scarborough" },
  "M2H": { lat: 43.8037, lng: -79.3593, city: "North York" },
  "M2J": { lat: 43.7785, lng: -79.3465, city: "North York" },
  "M2K": { lat: 43.7869, lng: -79.3858, city: "North York" },
  "M2L": { lat: 43.7574, lng: -79.3747, city: "North York" },
  "M2M": { lat: 43.7890, lng: -79.4085, city: "North York" },
  "M2N": { lat: 43.7700, lng: -79.4085, city: "North York" },
  "M2P": { lat: 43.7527, lng: -79.4085, city: "North York" },
  "M2R": { lat: 43.7785, lng: -79.4423, city: "North York" },
  "M3A": { lat: 43.7532, lng: -79.3296, city: "North York" },
  "M3B": { lat: 43.7458, lng: -79.3522, city: "North York" },
  "M3C": { lat: 43.7258, lng: -79.3409, city: "East York" },
  "M3H": { lat: 43.7532, lng: -79.4423, city: "North York" },
  "M3J": { lat: 43.7679, lng: -79.4873, city: "North York" },
  "M3K": { lat: 43.7374, lng: -79.4647, city: "North York" },
  "M3L": { lat: 43.7395, lng: -79.5099, city: "North York" },
  "M3M": { lat: 43.7279, lng: -79.4873, city: "North York" },
  "M3N": { lat: 43.7616, lng: -79.5212, city: "North York" },
  "M4A": { lat: 43.7258, lng: -79.3127, city: "East York" },
  "M4B": { lat: 43.7069, lng: -79.3127, city: "East York" },
  "M4C": { lat: 43.6943, lng: -79.3183, city: "East York" },
  "M4E": { lat: 43.6775, lng: -79.2958, city: "The Beaches" },
  "M4G": { lat: 43.7090, lng: -79.3635, city: "Leaside" },
  "M4H": { lat: 43.7048, lng: -79.3522, city: "East York" },
  "M4J": { lat: 43.6859, lng: -79.3352, city: "East York" },
  "M4K": { lat: 43.6796, lng: -79.3522, city: "Riverdale" },
  "M4L": { lat: 43.6691, lng: -79.3183, city: "The Beaches" },
  "M4M": { lat: 43.6607, lng: -79.3409, city: "Leslieville" },
  "M4N": { lat: 43.7279, lng: -79.3860, city: "Lawrence Park" },
  "M4P": { lat: 43.7111, lng: -79.3860, city: "Davisville" },
  "M4R": { lat: 43.7153, lng: -79.4085, city: "North Toronto" },
  "M4S": { lat: 43.7027, lng: -79.3860, city: "Davisville" },
  "M4T": { lat: 43.6901, lng: -79.3860, city: "Moore Park" },
  "M4V": { lat: 43.6859, lng: -79.3973, city: "Summerhill" },
  "M4W": { lat: 43.6796, lng: -79.3747, city: "Rosedale" },
  "M4X": { lat: 43.6670, lng: -79.3635, city: "Cabbagetown" },
  "M4Y": { lat: 43.6649, lng: -79.3835, city: "Church-Yonge" },
  "M5A": { lat: 43.6544, lng: -79.3606, city: "Corktown" },
  "M5B": { lat: 43.6565, lng: -79.3776, city: "Downtown" },
  "M5C": { lat: 43.6502, lng: -79.3776, city: "St. Lawrence" },
  "M5E": { lat: 43.6439, lng: -79.3720, city: "Harbourfront" },
  "M5G": { lat: 43.6565, lng: -79.3889, city: "Downtown" },
  "M5H": { lat: 43.6502, lng: -79.3889, city: "Financial District" },
  "M5J": { lat: 43.6397, lng: -79.3833, city: "Harbourfront" },
  "M5K": { lat: 43.6481, lng: -79.3833, city: "Financial District" },
  "M5L": { lat: 43.6460, lng: -79.3776, city: "Financial District" },
  "M5M": { lat: 43.7332, lng: -79.4198, city: "Bedford Park" },
  "M5N": { lat: 43.7111, lng: -79.4198, city: "Roselawn" },
  "M5P": { lat: 43.6943, lng: -79.4085, city: "Forest Hill" },
  "M5R": { lat: 43.6775, lng: -79.4085, city: "The Annex" },
  "M5S": { lat: 43.6607, lng: -79.3973, city: "U of T" },
  "M5T": { lat: 43.6523, lng: -79.3973, city: "Chinatown" },
  "M5V": { lat: 43.6418, lng: -79.3973, city: "Entertainment District" },
  "M5W": { lat: 43.6460, lng: -79.3889, city: "Downtown" },
  "M5X": { lat: 43.6481, lng: -79.3833, city: "Underground City" },
  "M6A": { lat: 43.7174, lng: -79.4536, city: "North York" },
  "M6B": { lat: 43.7090, lng: -79.4423, city: "Glencairn" },
  "M6C": { lat: 43.6922, lng: -79.4310, city: "Oakwood Village" },
  "M6E": { lat: 43.6880, lng: -79.4536, city: "Caledonia" },
  "M6G": { lat: 43.6691, lng: -79.4198, city: "Christie Pits" },
  "M6H": { lat: 43.6670, lng: -79.4423, city: "Dovercourt" },
  "M6J": { lat: 43.6481, lng: -79.4198, city: "Trinity Bellwoods" },
  "M6K": { lat: 43.6376, lng: -79.4310, city: "Parkdale" },
  "M6L": { lat: 43.7132, lng: -79.4873, city: "Keelesdale" },
  "M6M": { lat: 43.6943, lng: -79.4760, city: "Silverthorn" },
  "M6N": { lat: 43.6754, lng: -79.4647, city: "Runnymede" },
  "M6P": { lat: 43.6628, lng: -79.4647, city: "High Park North" },
  "M6R": { lat: 43.6502, lng: -79.4536, city: "Parkdale" },
  "M6S": { lat: 43.6502, lng: -79.4760, city: "Runnymede" },
  "M7A": { lat: 43.6628, lng: -79.3889, city: "Queen's Park" },
  "M7R": { lat: 43.6364, lng: -79.6155, city: "Mississauga" },
  "M7Y": { lat: 43.6628, lng: -79.3210, city: "Business Reply" },
  "M8V": { lat: 43.6040, lng: -79.5016, city: "Mimico" },
  "M8W": { lat: 43.6019, lng: -79.5353, city: "Long Branch" },
  "M8X": { lat: 43.6535, lng: -79.5099, city: "Islington" },
  "M8Y": { lat: 43.6368, lng: -79.4986, city: "Mimico" },
  "M8Z": { lat: 43.6238, lng: -79.5212, city: "Mimico" },
  "M9A": { lat: 43.6670, lng: -79.5325, city: "Etobicoke" },
  "M9B": { lat: 43.6502, lng: -79.5551, city: "West Deane Park" },
  "M9C": { lat: 43.6334, lng: -79.5777, city: "Markland Wood" },
  "M9L": { lat: 43.7553, lng: -79.5438, city: "Humber Summit" },
  "M9M": { lat: 43.7237, lng: -79.5438, city: "Emery" },
  "M9N": { lat: 43.7069, lng: -79.5212, city: "Weston" },
  "M9P": { lat: 43.6964, lng: -79.5325, city: "Westmount" },
  "M9R": { lat: 43.6880, lng: -79.5551, city: "Martin Grove" },
  "M9V": { lat: 43.7395, lng: -79.5777, city: "Rexdale" },
  "M9W": { lat: 43.7069, lng: -79.5890, city: "Rexdale" },
  
  // GTA / Peel / York / Durham (L prefix)
  "L1A": { lat: 44.0431, lng: -78.7151, city: "Lindsay" },
  "L1B": { lat: 44.0400, lng: -78.7150, city: "Lindsay" },
  "L1C": { lat: 44.0378, lng: -78.7340, city: "Lindsay" },
  "L1E": { lat: 43.8971, lng: -78.8658, city: "Oshawa" },
  "L1G": { lat: 43.8971, lng: -78.8433, city: "Oshawa" },
  "L1H": { lat: 43.9033, lng: -78.8545, city: "Oshawa" },
  "L1J": { lat: 43.8846, lng: -78.8545, city: "Oshawa" },
  "L1K": { lat: 43.8659, lng: -78.8320, city: "Oshawa" },
  "L1L": { lat: 43.9283, lng: -78.8320, city: "Oshawa" },
  "L1M": { lat: 43.9345, lng: -78.8771, city: "Courtice" },
  "L1N": { lat: 43.8596, lng: -78.9447, city: "Whitby" },
  "L1P": { lat: 43.8721, lng: -78.9222, city: "Whitby" },
  "L1R": { lat: 43.8908, lng: -78.9334, city: "Whitby" },
  "L1S": { lat: 43.8408, lng: -79.0236, city: "Ajax" },
  "L1T": { lat: 43.8470, lng: -79.0461, city: "Ajax" },
  "L1V": { lat: 43.8221, lng: -79.0912, city: "Pickering" },
  "L1W": { lat: 43.8345, lng: -79.0687, city: "Pickering" },
  "L1X": { lat: 43.8158, lng: -79.0461, city: "Pickering" },
  "L1Y": { lat: 43.8283, lng: -79.1138, city: "Pickering" },
  "L1Z": { lat: 43.8159, lng: -79.1250, city: "Pickering" },
  "L2A": { lat: 42.8792, lng: -79.0516, city: "Fort Erie" },
  "L2E": { lat: 43.0896, lng: -79.0791, city: "Niagara Falls" },
  "L2G": { lat: 43.0958, lng: -79.0791, city: "Niagara Falls" },
  "L2H": { lat: 43.1020, lng: -79.0791, city: "Niagara Falls" },
  "L2J": { lat: 43.1145, lng: -79.0791, city: "Niagara Falls" },
  "L2M": { lat: 43.1666, lng: -79.2469, city: "St. Catharines" },
  "L2N": { lat: 43.1853, lng: -79.2694, city: "St. Catharines" },
  "L2P": { lat: 43.1853, lng: -79.2244, city: "St. Catharines" },
  "L2R": { lat: 43.1728, lng: -79.2469, city: "St. Catharines" },
  "L2S": { lat: 43.1291, lng: -79.2469, city: "St. Catharines" },
  "L2T": { lat: 43.1478, lng: -79.2694, city: "St. Catharines" },
  "L2V": { lat: 43.1603, lng: -79.2019, city: "St. Catharines" },
  "L2W": { lat: 43.1853, lng: -79.2919, city: "St. Catharines" },
  "L3B": { lat: 42.9855, lng: -79.2355, city: "Welland" },
  "L3C": { lat: 42.9918, lng: -79.2130, city: "Welland" },
  "L3K": { lat: 42.8667, lng: -79.2580, city: "Port Colborne" },
  "L3M": { lat: 43.2478, lng: -79.2130, city: "Grimsby" },
  "L3P": { lat: 43.8642, lng: -79.3296, city: "Markham" },
  "L3R": { lat: 43.8517, lng: -79.3747, city: "Markham" },
  "L3S": { lat: 43.8830, lng: -79.3971, city: "Markham" },
  "L3T": { lat: 43.8579, lng: -79.4310, city: "Thornhill" },
  "L4A": { lat: 44.0431, lng: -79.4847, city: "Sharon" },
  "L4B": { lat: 43.8517, lng: -79.3971, city: "Richmond Hill" },
  "L4C": { lat: 43.8704, lng: -79.4423, city: "Richmond Hill" },
  "L4E": { lat: 43.9080, lng: -79.4423, city: "Richmond Hill" },
  "L4G": { lat: 44.0493, lng: -79.4847, city: "Aurora" },
  "L4H": { lat: 43.8267, lng: -79.5438, city: "Vaughan" },
  "L4J": { lat: 43.8142, lng: -79.4536, city: "Vaughan" },
  "L4K": { lat: 43.8267, lng: -79.4873, city: "Vaughan" },
  "L4L": { lat: 43.7928, lng: -79.5551, city: "Vaughan" },
  // Barrie - IMPORTANT: Full 6-char codes for accuracy
  "L4M": { lat: 44.3894, lng: -79.6903, city: "Barrie" },
  "L4N": { lat: 44.3718, lng: -79.6678, city: "Barrie" },
  "L9S": { lat: 44.3312, lng: -79.6790, city: "Innisfil" },
  "L9X": { lat: 44.2875, lng: -79.7241, city: "Alliston" },
  "L9Y": { lat: 44.5062, lng: -79.8819, city: "Collingwood" },
  "L9Z": { lat: 44.4312, lng: -79.9270, city: "Wasaga Beach" },
  "L0L": { lat: 44.4000, lng: -79.7000, city: "Simcoe County" },
  "L0K": { lat: 44.5500, lng: -79.5500, city: "Orillia Area" },
  "L0M": { lat: 44.6000, lng: -80.0000, city: "Grey County" },
  "L4S": { lat: 43.8954, lng: -79.4647, city: "Richmond Hill" },
  "L4T": { lat: 43.7179, lng: -79.6115, city: "Mississauga" },
  "L4V": { lat: 43.6954, lng: -79.6003, city: "Mississauga" },
  "L4W": { lat: 43.6579, lng: -79.6115, city: "Mississauga" },
  "L4X": { lat: 43.6329, lng: -79.5890, city: "Mississauga" },
  "L4Y": { lat: 43.6204, lng: -79.5777, city: "Mississauga" },
  "L4Z": { lat: 43.6079, lng: -79.6003, city: "Mississauga" },
  "L5A": { lat: 43.5829, lng: -79.6228, city: "Mississauga" },
  "L5B": { lat: 43.5954, lng: -79.6340, city: "Mississauga" },
  "L5C": { lat: 43.5704, lng: -79.6453, city: "Mississauga" },
  "L5E": { lat: 43.5579, lng: -79.5890, city: "Mississauga" },
  "L5G": { lat: 43.5454, lng: -79.5890, city: "Mississauga" },
  "L5H": { lat: 43.5329, lng: -79.5890, city: "Mississauga" },
  "L5J": { lat: 43.4954, lng: -79.6228, city: "Oakville" },
  "L5K": { lat: 43.5329, lng: -79.6453, city: "Mississauga" },
  "L5L": { lat: 43.5329, lng: -79.6678, city: "Mississauga" },
  "L5M": { lat: 43.5579, lng: -79.6903, city: "Mississauga" },
  "L5N": { lat: 43.5829, lng: -79.7016, city: "Mississauga" },
  "L5P": { lat: 43.5954, lng: -79.6790, city: "Mississauga" },
  "L5R": { lat: 43.6079, lng: -79.6565, city: "Mississauga" },
  "L5S": { lat: 43.6892, lng: -79.6340, city: "Malton" },
  "L5T": { lat: 43.6767, lng: -79.6678, city: "Mississauga" },
  "L5V": { lat: 43.6454, lng: -79.6903, city: "Mississauga" },
  "L5W": { lat: 43.6579, lng: -79.7016, city: "Mississauga" },
  "L6A": { lat: 43.8330, lng: -79.5664, city: "Maple" },
  "L6B": { lat: 43.8705, lng: -79.2507, city: "Markham" },
  "L6C": { lat: 43.8892, lng: -79.3183, city: "Markham" },
  "L6E": { lat: 43.9017, lng: -79.2733, city: "Markham" },
  "L6G": { lat: 43.9267, lng: -79.3409, city: "Markham" },
  "L6H": { lat: 43.4766, lng: -79.6903, city: "Oakville" },
  "L6J": { lat: 43.4516, lng: -79.6790, city: "Oakville" },
  "L6K": { lat: 43.4266, lng: -79.7016, city: "Oakville" },
  "L6L": { lat: 43.4141, lng: -79.7241, city: "Oakville" },
  "L6M": { lat: 43.4391, lng: -79.7579, city: "Oakville" },
  "L6P": { lat: 43.7991, lng: -79.6115, city: "Brampton" },
  "L6R": { lat: 43.7554, lng: -79.7016, city: "Brampton" },
  "L6S": { lat: 43.7366, lng: -79.7354, city: "Brampton" },
  "L6T": { lat: 43.7116, lng: -79.7354, city: "Brampton" },
  "L6V": { lat: 43.6891, lng: -79.7354, city: "Brampton" },
  "L6W": { lat: 43.6891, lng: -79.7579, city: "Brampton" },
  "L6X": { lat: 43.7054, lng: -79.7804, city: "Brampton" },
  "L6Y": { lat: 43.7241, lng: -79.7804, city: "Brampton" },
  "L6Z": { lat: 43.7616, lng: -79.7692, city: "Brampton" },
  "L7A": { lat: 43.7179, lng: -79.8030, city: "Brampton" },
  "L7B": { lat: 44.0181, lng: -79.4622, city: "King City" },
  "L7C": { lat: 43.7679, lng: -79.7917, city: "Brampton" },
  "L7E": { lat: 43.9017, lng: -79.4986, city: "Bolton" },
  "L7G": { lat: 43.7179, lng: -80.0396, city: "Georgetown" },
  "L7J": { lat: 43.6329, lng: -79.9833, city: "Acton" },
  "L7K": { lat: 43.9393, lng: -79.9608, city: "Orangeville" },
  "L7L": { lat: 43.3141, lng: -79.8593, city: "Burlington" },
  "L7M": { lat: 43.3391, lng: -79.8031, city: "Burlington" },
  "L7N": { lat: 43.3266, lng: -79.7918, city: "Burlington" },
  "L7P": { lat: 43.3516, lng: -79.8143, city: "Burlington" },
  "L7R": { lat: 43.3266, lng: -79.7918, city: "Burlington" },
  "L7S": { lat: 43.3516, lng: -79.7693, city: "Burlington" },
  "L7T": { lat: 43.3266, lng: -79.7693, city: "Burlington" },
  "L8E": { lat: 43.2183, lng: -79.7806, city: "Hamilton" },
  "L8G": { lat: 43.2308, lng: -79.7693, city: "Hamilton" },
  "L8H": { lat: 43.2433, lng: -79.8031, city: "Hamilton" },
  "L8J": { lat: 43.2058, lng: -79.7693, city: "Hamilton" },
  "L8K": { lat: 43.2558, lng: -79.8368, city: "Hamilton" },
  "L8L": { lat: 43.2495, lng: -79.8481, city: "Hamilton" },
  "L8M": { lat: 43.2370, lng: -79.8481, city: "Hamilton" },
  "L8N": { lat: 43.2558, lng: -79.8593, city: "Hamilton" },
  "L8P": { lat: 43.2495, lng: -79.8706, city: "Hamilton" },
  "L8R": { lat: 43.2620, lng: -79.8706, city: "Hamilton" },
  "L8S": { lat: 43.2683, lng: -79.8818, city: "Hamilton" },
  "L8T": { lat: 43.2495, lng: -79.8931, city: "Hamilton" },
  "L8V": { lat: 43.2370, lng: -79.8818, city: "Hamilton" },
  "L8W": { lat: 43.2120, lng: -79.8593, city: "Hamilton" },
  "L9A": { lat: 43.2558, lng: -79.9043, city: "Hamilton" },
  "L9B": { lat: 43.2245, lng: -79.9268, city: "Hamilton" },
  "L9C": { lat: 43.2370, lng: -79.9156, city: "Hamilton" },
  "L9G": { lat: 43.3455, lng: -80.0284, city: "Flamborough" },
  "L9H": { lat: 43.2745, lng: -79.9493, city: "Dundas" },
  "L9K": { lat: 43.2120, lng: -79.9719, city: "Hamilton" },
  "L9T": { lat: 43.5079, lng: -79.8818, city: "Milton" },
  "L9W": { lat: 43.8393, lng: -79.9383, city: "Orangeville" },
  
  // Ottawa / Eastern Ontario (K prefix)
  "K1A": { lat: 45.4215, lng: -75.6993, city: "Ottawa Downtown" },
  "K1B": { lat: 45.4340, lng: -75.6543, city: "Ottawa East" },
  "K1C": { lat: 45.4777, lng: -75.5755, city: "Orleans" },
  "K1E": { lat: 45.4902, lng: -75.5305, city: "Orleans" },
  "K1G": { lat: 45.4090, lng: -75.6318, city: "Alta Vista" },
  "K1H": { lat: 45.3965, lng: -75.6543, city: "Alta Vista" },
  "K1J": { lat: 45.4402, lng: -75.6206, city: "Beacon Hill" },
  "K1K": { lat: 45.4527, lng: -75.6543, city: "Vanier" },
  "K1L": { lat: 45.4340, lng: -75.6656, city: "Lowertown" },
  "K1M": { lat: 45.4527, lng: -75.6881, city: "Rockcliffe" },
  "K1N": { lat: 45.4277, lng: -75.6881, city: "Sandy Hill" },
  "K1P": { lat: 45.4215, lng: -75.6993, city: "Downtown" },
  "K1R": { lat: 45.4090, lng: -75.7106, city: "Centretown" },
  "K1S": { lat: 45.3965, lng: -75.7106, city: "Old Ottawa South" },
  "K1T": { lat: 45.3590, lng: -75.6318, city: "Gloucester" },
  "K1V": { lat: 45.3590, lng: -75.6769, city: "South Keys" },
  "K1W": { lat: 45.4152, lng: -75.5530, city: "Orleans" },
  "K1X": { lat: 45.3340, lng: -75.6318, city: "Gloucester" },
  "K1Y": { lat: 45.4090, lng: -75.7331, city: "Hintonburg" },
  "K1Z": { lat: 45.4152, lng: -75.7556, city: "Westboro" },
  "K2A": { lat: 45.3903, lng: -75.7556, city: "Hampton Park" },
  "K2B": { lat: 45.3840, lng: -75.7781, city: "Bells Corners" },
  "K2C": { lat: 45.3590, lng: -75.7331, city: "Baseline" },
  "K2E": { lat: 45.3465, lng: -75.7106, city: "Merivale" },
  "K2G": { lat: 45.3340, lng: -75.7556, city: "Nepean" },
  "K2H": { lat: 45.3403, lng: -75.8006, city: "Nepean" },
  "K2J": { lat: 45.2840, lng: -75.7331, city: "Barrhaven" },
  "K2K": { lat: 45.3465, lng: -75.9082, city: "Kanata" },
  "K2L": { lat: 45.3215, lng: -75.8682, city: "Kanata" },
  "K2M": { lat: 45.3028, lng: -75.8907, city: "Kanata" },
  "K2P": { lat: 45.4152, lng: -75.6881, city: "Golden Triangle" },
  "K2R": { lat: 45.2715, lng: -75.8231, city: "Manotick" },
  "K2S": { lat: 45.3903, lng: -75.8907, city: "Stittsville" },
  "K2T": { lat: 45.3653, lng: -75.9082, city: "Kanata" },
  "K2V": { lat: 45.3153, lng: -75.9282, city: "Kanata" },
  "K2W": { lat: 45.3590, lng: -75.9507, city: "Kanata West" },
  "K4A": { lat: 45.4902, lng: -75.4855, city: "Orleans" },
  "K4B": { lat: 45.5152, lng: -75.4630, city: "Cumberland" },
  "K4C": { lat: 45.5277, lng: -75.4180, city: "Navan" },
  "K4K": { lat: 45.4652, lng: -75.2829, city: "Rockland" },
  "K4M": { lat: 45.3840, lng: -75.3280, city: "Vars" },
  "K4P": { lat: 45.2340, lng: -75.6431, city: "Greely" },
  "K4R": { lat: 45.1777, lng: -75.6656, city: "Osgoode" },
  "K6A": { lat: 45.5089, lng: -74.1310, city: "Hawkesbury" },
  "K6H": { lat: 45.0633, lng: -74.7295, city: "Cornwall" },
  "K6J": { lat: 45.0258, lng: -74.7295, city: "Cornwall" },
  "K6K": { lat: 45.0133, lng: -74.7295, city: "Cornwall" },
  "K6T": { lat: 44.5945, lng: -75.6768, city: "Brockville" },
  "K6V": { lat: 44.5820, lng: -75.6768, city: "Brockville" },
  "K7A": { lat: 44.9003, lng: -76.2617, city: "Smiths Falls" },
  "K7C": { lat: 44.9128, lng: -76.0179, city: "Carleton Place" },
  "K7G": { lat: 44.3500, lng: -76.5485, city: "Gananoque" },
  "K7H": { lat: 44.7670, lng: -76.6273, city: "Perth" },
  "K7K": { lat: 44.2312, lng: -76.4810, city: "Kingston" },
  "K7L": { lat: 44.2437, lng: -76.5035, city: "Kingston" },
  "K7M": { lat: 44.2562, lng: -76.5260, city: "Kingston" },
  "K7N": { lat: 44.2437, lng: -76.4585, city: "Kingston" },
  "K7P": { lat: 44.2312, lng: -76.5485, city: "Kingston" },
  "K8A": { lat: 45.4283, lng: -75.7106, city: "Ottawa" },
  "K8H": { lat: 45.4939, lng: -76.3517, city: "Renfrew" },
  "K8N": { lat: 44.1628, lng: -77.3832, city: "Belleville" },
  "K8P": { lat: 44.1378, lng: -77.4057, city: "Belleville" },
  "K8R": { lat: 44.1878, lng: -77.3382, city: "Belleville" },
  "K8V": { lat: 44.2545, lng: -77.0268, city: "Napanee" },
  "K9A": { lat: 43.8704, lng: -78.2677, city: "Port Hope" },
  "K9H": { lat: 44.3008, lng: -78.3240, city: "Peterborough" },
  "K9J": { lat: 44.3258, lng: -78.3015, city: "Peterborough" },
  "K9K": { lat: 44.3008, lng: -78.2790, city: "Peterborough" },
  "K9L": { lat: 44.3383, lng: -78.3240, city: "Peterborough" },
  "K9V": { lat: 44.0931, lng: -78.7101, city: "Lindsay" },
  
  // Southwestern Ontario (N prefix)
  "N0A": { lat: 42.9897, lng: -81.2522, city: "Western Ontario Rural" },
  "N0B": { lat: 43.4700, lng: -80.4833, city: "Wellington County" },
  "N0C": { lat: 43.8833, lng: -80.3667, city: "Grey County" },
  "N0E": { lat: 43.0167, lng: -80.7500, city: "Oxford County" },
  "N0G": { lat: 43.5333, lng: -81.5833, city: "Huron County" },
  "N0H": { lat: 44.2667, lng: -81.0333, city: "Bruce County" },
  "N0J": { lat: 42.9000, lng: -81.5000, city: "Elgin County" },
  "N0K": { lat: 43.6333, lng: -80.8667, city: "Perth County" },
  "N0L": { lat: 42.7500, lng: -81.7667, city: "Elgin County" },
  "N0M": { lat: 43.2167, lng: -81.8500, city: "Middlesex County" },
  "N0N": { lat: 43.0667, lng: -82.0833, city: "Lambton County" },
  "N0P": { lat: 42.3167, lng: -82.0000, city: "Chatham-Kent" },
  "N0R": { lat: 42.0833, lng: -82.5500, city: "Essex County" },
  "N1A": { lat: 43.8370, lng: -80.2645, city: "Mount Forest" },
  "N1C": { lat: 43.9495, lng: -80.7645, city: "Owen Sound" },
  "N1E": { lat: 43.5320, lng: -80.2420, city: "Guelph" },
  "N1G": { lat: 43.5445, lng: -80.2195, city: "Guelph" },
  "N1H": { lat: 43.5445, lng: -80.2645, city: "Guelph" },
  "N1K": { lat: 43.5070, lng: -80.2307, city: "Guelph" },
  "N1L": { lat: 43.4633, lng: -80.2307, city: "Guelph" },
  "N1M": { lat: 43.5695, lng: -80.2645, city: "Guelph" },
  "N1P": { lat: 43.4883, lng: -80.1745, city: "Guelph" },
  "N1R": { lat: 43.4508, lng: -80.4770, city: "Cambridge" },
  "N1S": { lat: 43.4195, lng: -80.4545, city: "Cambridge" },
  "N1T": { lat: 43.3945, lng: -80.4320, city: "Cambridge" },
  "N2A": { lat: 43.3695, lng: -80.4658, city: "Kitchener" },
  "N2B": { lat: 43.4383, lng: -80.4432, city: "Kitchener" },
  "N2C": { lat: 43.4070, lng: -80.4432, city: "Kitchener" },
  "N2E": { lat: 43.4070, lng: -80.4658, city: "Kitchener" },
  "N2G": { lat: 43.4508, lng: -80.4883, city: "Kitchener" },
  "N2H": { lat: 43.4633, lng: -80.5108, city: "Kitchener" },
  "N2J": { lat: 43.4758, lng: -80.5108, city: "Waterloo" },
  "N2K": { lat: 43.4758, lng: -80.5446, city: "Waterloo" },
  "N2L": { lat: 43.4758, lng: -80.5559, city: "Waterloo" },
  "N2M": { lat: 43.4320, lng: -80.5221, city: "Kitchener" },
  "N2N": { lat: 43.4320, lng: -80.4995, city: "Kitchener" },
  "N2P": { lat: 43.4008, lng: -80.5108, city: "Kitchener" },
  "N2R": { lat: 43.4633, lng: -80.5671, city: "Waterloo" },
  "N2T": { lat: 43.4883, lng: -80.5896, city: "Waterloo" },
  "N2V": { lat: 43.5070, lng: -80.5671, city: "Waterloo" },
  "N3A": { lat: 43.3758, lng: -80.3207, city: "Ayr" },
  "N3B": { lat: 43.5258, lng: -80.5446, city: "Elmira" },
  "N3C": { lat: 43.3445, lng: -80.3545, city: "Paris" },
  "N3H": { lat: 43.1883, lng: -80.3207, city: "Woodstock" },
  "N3L": { lat: 42.9820, lng: -80.7595, city: "Tillsonburg" },
  "N3P": { lat: 43.0695, lng: -80.3432, city: "Norwich" },
  "N3R": { lat: 43.1383, lng: -80.2645, city: "Brantford" },
  "N3S": { lat: 43.1383, lng: -80.2195, city: "Brantford" },
  "N3T": { lat: 43.1508, lng: -80.2645, city: "Brantford" },
  "N3V": { lat: 43.1133, lng: -80.2870, city: "Brantford" },
  "N3W": { lat: 43.1758, lng: -80.2532, city: "Brantford" },
  "N4B": { lat: 43.0695, lng: -80.7482, city: "Ingersoll" },
  "N4G": { lat: 43.3383, lng: -80.9045, city: "Stratford" },
  "N4K": { lat: 44.0633, lng: -80.9383, city: "Hanover" },
  "N4L": { lat: 43.7320, lng: -81.3370, city: "Wingham" },
  "N4N": { lat: 44.1883, lng: -81.0720, city: "Walkerton" },
  "N4S": { lat: 43.1320, lng: -80.7482, city: "Woodstock" },
  "N4T": { lat: 43.1133, lng: -80.7707, city: "Woodstock" },
  "N4V": { lat: 43.1195, lng: -80.8045, city: "Woodstock" },
  "N4W": { lat: 43.8820, lng: -80.6582, city: "Arthur" },
  "N4X": { lat: 43.0195, lng: -80.7707, city: "Woodstock" },
  "N4Z": { lat: 43.0258, lng: -80.6920, city: "Woodstock" },
  "N5A": { lat: 43.0633, lng: -81.0270, city: "St. Marys" },
  "N5C": { lat: 43.0320, lng: -81.1845, city: "Exeter" },
  "N5H": { lat: 42.9820, lng: -80.4207, city: "Simcoe" },
  "N5L": { lat: 42.8695, lng: -80.4432, city: "Port Dover" },
  "N5P": { lat: 43.0070, lng: -80.5108, city: "Delhi" },
  "N5R": { lat: 42.8508, lng: -80.2645, city: "Jarvis" },
  "N5V": { lat: 43.0133, lng: -81.2070, city: "London" },
  "N5W": { lat: 43.0008, lng: -81.1845, city: "London" },
  "N5X": { lat: 43.0633, lng: -81.2408, city: "London" },
  "N5Y": { lat: 43.0320, lng: -81.2408, city: "London" },
  "N5Z": { lat: 43.0070, lng: -81.2520, city: "London" },
  "N6A": { lat: 42.9820, lng: -81.2520, city: "London" },
  "N6B": { lat: 42.9820, lng: -81.2295, city: "London" },
  "N6C": { lat: 42.9633, lng: -81.2295, city: "London" },
  "N6E": { lat: 42.9445, lng: -81.2070, city: "London" },
  "N6G": { lat: 43.0195, lng: -81.2745, city: "London" },
  "N6H": { lat: 43.0008, lng: -81.3195, city: "London" },
  "N6J": { lat: 42.9695, lng: -81.2970, city: "London" },
  "N6K": { lat: 42.9383, lng: -81.2970, city: "London" },
  "N6L": { lat: 42.9133, lng: -81.2633, city: "London" },
  "N6M": { lat: 43.0820, lng: -81.3083, city: "London" },
  "N6N": { lat: 42.9133, lng: -81.1845, city: "London" },
  "N6P": { lat: 42.9320, lng: -81.3308, city: "London" },
  "N7A": { lat: 42.9508, lng: -81.6383, city: "Strathroy" },
  "N7G": { lat: 42.9633, lng: -82.0158, city: "Sarnia" },
  "N7L": { lat: 42.3383, lng: -81.8308, city: "Chatham" },
  "N7M": { lat: 42.4008, lng: -81.8645, city: "Chatham" },
  "N7S": { lat: 42.9758, lng: -82.3833, city: "Sarnia" },
  "N7T": { lat: 42.9883, lng: -82.3720, city: "Sarnia" },
  "N7V": { lat: 43.0008, lng: -82.3833, city: "Point Edward" },
  "N7W": { lat: 42.9445, lng: -82.3383, city: "Sarnia" },
  "N7X": { lat: 42.9508, lng: -82.3608, city: "Sarnia" },
  "N8A": { lat: 42.2958, lng: -82.1095, city: "Wallaceburg" },
  "N8H": { lat: 42.0570, lng: -82.5870, city: "Leamington" },
  "N8M": { lat: 42.1633, lng: -82.7783, city: "Kingsville" },
  "N8N": { lat: 42.2945, lng: -82.9433, city: "Amherstburg" },
  "N8P": { lat: 42.3320, lng: -82.9433, city: "Amherstburg" },
  "N8R": { lat: 42.2633, lng: -82.9095, city: "Essex" },
  "N8S": { lat: 42.2758, lng: -82.8308, city: "Kingsville" },
  "N8T": { lat: 42.2695, lng: -82.7108, city: "Wheatley" },
  "N8V": { lat: 42.3445, lng: -83.0220, city: "Windsor" },
  "N8W": { lat: 42.2945, lng: -83.0108, city: "Windsor" },
  "N8X": { lat: 42.2945, lng: -83.0333, city: "Windsor" },
  "N8Y": { lat: 42.3258, lng: -83.0108, city: "Windsor" },
  "N9A": { lat: 42.3195, lng: -83.0445, city: "Windsor" },
  "N9B": { lat: 42.3008, lng: -83.0670, city: "Windsor" },
  "N9C": { lat: 42.2883, lng: -83.0670, city: "Windsor" },
  "N9E": { lat: 42.2633, lng: -83.0558, city: "Windsor" },
  "N9G": { lat: 42.2820, lng: -83.0895, city: "Windsor" },
  "N9H": { lat: 42.2695, lng: -83.0220, city: "Tecumseh" },
  "N9J": { lat: 42.2508, lng: -82.9770, city: "Tecumseh" },
  "N9K": { lat: 42.2258, lng: -82.9658, city: "Tecumseh" },
  "N9V": { lat: 42.3133, lng: -83.0783, city: "Windsor" },
  "N9Y": { lat: 42.3320, lng: -83.0558, city: "Windsor" },
  
  // Northern Ontario (P prefix)
  "P0A": { lat: 46.3167, lng: -79.9333, city: "Parry Sound District" },
  "P0B": { lat: 46.4833, lng: -80.0000, city: "Sudbury District" },
  "P0C": { lat: 44.7500, lng: -79.9167, city: "Muskoka" },
  "P0E": { lat: 46.5000, lng: -81.0000, city: "Sudbury District" },
  "P0G": { lat: 46.0000, lng: -81.5000, city: "Manitoulin" },
  "P0H": { lat: 45.3500, lng: -79.2167, city: "Muskoka" },
  "P0J": { lat: 47.0833, lng: -79.3500, city: "Temiskaming" },
  "P0K": { lat: 47.5333, lng: -79.6667, city: "Temiskaming" },
  "P0L": { lat: 48.0000, lng: -79.7500, city: "Cochrane District" },
  "P0M": { lat: 46.0000, lng: -80.5000, city: "Sudbury District" },
  "P0N": { lat: 48.0000, lng: -82.0000, city: "Algoma District" },
  "P0P": { lat: 47.0000, lng: -84.5000, city: "Algoma District" },
  "P0R": { lat: 46.5000, lng: -84.5000, city: "Algoma District" },
  "P0S": { lat: 46.5000, lng: -83.0000, city: "Algoma District" },
  "P0T": { lat: 49.7667, lng: -86.9500, city: "Thunder Bay District" },
  "P0V": { lat: 50.0000, lng: -88.0000, city: "Thunder Bay District" },
  "P0W": { lat: 52.0000, lng: -90.0000, city: "Kenora District" },
  "P0X": { lat: 51.0000, lng: -93.5000, city: "Kenora District" },
  "P1A": { lat: 46.3167, lng: -79.4667, city: "North Bay" },
  "P1B": { lat: 46.3042, lng: -79.4617, city: "North Bay" },
  "P1C": { lat: 46.2792, lng: -79.4392, city: "North Bay" },
  "P1H": { lat: 45.3833, lng: -79.2167, city: "Huntsville" },
  "P1L": { lat: 45.0333, lng: -79.3000, city: "Bracebridge" },
  "P1P": { lat: 45.0208, lng: -79.3025, city: "Bracebridge" },
  "P2A": { lat: 46.0167, lng: -79.6500, city: "Powassan" },
  "P2B": { lat: 46.1500, lng: -79.3833, city: "Mattawa" },
  "P2N": { lat: 48.4833, lng: -81.3333, city: "Timmins" },
  "P3A": { lat: 46.4917, lng: -80.9592, city: "Sudbury" },
  "P3B": { lat: 46.5042, lng: -80.9817, city: "Sudbury" },
  "P3C": { lat: 46.4792, lng: -81.0042, city: "Sudbury" },
  "P3E": { lat: 46.4917, lng: -81.0267, city: "Sudbury" },
  "P3G": { lat: 46.4667, lng: -81.0492, city: "Sudbury" },
  "P3L": { lat: 46.5792, lng: -80.7992, city: "Hanmer" },
  "P3N": { lat: 46.5167, lng: -80.8217, city: "Val Caron" },
  "P3P": { lat: 46.5292, lng: -80.8667, city: "Chelmsford" },
  "P3Y": { lat: 46.3167, lng: -79.9333, city: "Parry Sound" },
  "P4N": { lat: 48.4583, lng: -81.3283, city: "Timmins" },
  "P4P": { lat: 48.4458, lng: -81.3508, city: "Timmins" },
  "P4R": { lat: 48.4333, lng: -81.3733, city: "Timmins" },
  "P5A": { lat: 46.5167, lng: -82.7333, city: "Elliot Lake" },
  "P5E": { lat: 46.2833, lng: -82.8333, city: "Blind River" },
  "P5N": { lat: 48.7500, lng: -80.7500, city: "Kapuskasing" },
  "P6A": { lat: 46.5292, lng: -84.3467, city: "Sault Ste. Marie" },
  "P6B": { lat: 46.5042, lng: -84.3467, city: "Sault Ste. Marie" },
  "P6C": { lat: 46.5167, lng: -84.3692, city: "Sault Ste. Marie" },
  "P7A": { lat: 48.4000, lng: -89.2500, city: "Thunder Bay" },
  "P7B": { lat: 48.3833, lng: -89.2667, city: "Thunder Bay" },
  "P7C": { lat: 48.4167, lng: -89.2833, city: "Thunder Bay" },
  "P7E": { lat: 48.4333, lng: -89.3000, city: "Thunder Bay" },
  "P7G": { lat: 48.4500, lng: -89.3167, city: "Thunder Bay" },
  "P7J": { lat: 48.4667, lng: -89.3333, city: "Thunder Bay" },
  "P7K": { lat: 48.4833, lng: -89.3500, city: "Thunder Bay" },
  "P8N": { lat: 49.7667, lng: -94.4833, city: "Kenora" },
  "P8T": { lat: 50.1167, lng: -91.9167, city: "Sioux Lookout" },
  "P9A": { lat: 49.0667, lng: -88.1500, city: "Marathon" },
  "P9N": { lat: 48.8500, lng: -88.3333, city: "Nipigon" },
};

// Fallback coordinates by first letter (provinces/broad regions)
const postalCodeCoordinates: Record<string, { lat: number; lng: number; city: string }> = {
  // Ontario
  "M": { lat: 43.6532, lng: -79.3832, city: "Toronto" },
  "L": { lat: 43.5890, lng: -79.6441, city: "GTA/Peel" },
  "K": { lat: 45.4215, lng: -75.6972, city: "Ottawa/Eastern Ontario" },
  "N": { lat: 43.0096, lng: -81.2737, city: "Southwestern Ontario" },
  "P": { lat: 46.4917, lng: -80.9930, city: "Northern Ontario" },
  // Other provinces
  "H": { lat: 45.5017, lng: -73.5673, city: "Montreal" },
  "G": { lat: 46.8139, lng: -71.2080, city: "Quebec City" },
  "J": { lat: 45.5, lng: -73.0, city: "Quebec Rural" },
  "V": { lat: 49.2827, lng: -123.1207, city: "Vancouver/BC" },
  "T": { lat: 51.0447, lng: -114.0719, city: "Calgary/Alberta" },
  "R": { lat: 49.8951, lng: -97.1384, city: "Winnipeg/Manitoba" },
  "S": { lat: 52.1332, lng: -106.6700, city: "Saskatchewan" },
  "B": { lat: 44.6488, lng: -63.5752, city: "Nova Scotia" },
  "E": { lat: 45.9636, lng: -66.6431, city: "New Brunswick" },
  "A": { lat: 47.5615, lng: -52.7126, city: "Newfoundland" },
  "C": { lat: 46.2382, lng: -63.1311, city: "PEI" },
};

// Get approximate coordinates from postal code
// Uses deterministic hash for stable variation (same postal code = same coords every time)
export const getCoordinatesFromPostalCode = (postalCode: string): { lat: number; lng: number } | null => {
  if (!isValidCanadianPostalCode(postalCode)) {
    return null;
  }

  const cleaned = postalCode.replace(/\s/g, "").toUpperCase();
  const fsa = cleaned.substring(0, 3); // Forward Sortation Area
  const firstLetter = cleaned.charAt(0);
  
  // Use deterministic hash for stable variation
  const hash = hashPostalCode(cleaned);
  
  // Create stable offset (±0.005 degrees, ~500m variation) - reduced for better accuracy
  const latOffset = ((hash % 1000) / 1000 - 0.5) * 0.01;
  const lngOffset = (((hash >> 10) % 1000) / 1000 - 0.5) * 0.01;

  // First check for precise Ontario FSA match
  if (ontarioFSACoordinates[fsa]) {
    const coords = ontarioFSACoordinates[fsa];
    return {
      lat: coords.lat + latOffset,
      lng: coords.lng + lngOffset,
    };
  }

  // Fall back to first letter for other areas
  const coords = postalCodeCoordinates[firstLetter];
  if (coords) {
    // Add variation based on second character for non-Ontario codes
    const charVariation = parseInt(cleaned.charAt(1)) * 0.015;
    return {
      lat: coords.lat + latOffset + charVariation,
      lng: coords.lng + lngOffset - charVariation,
    };
  }

  return null;
};

// Get coordinates for office postal code (Belleville K8N)
export const getOfficeCoordinates = (): { lat: number; lng: number } => {
  return { lat: 44.1628, lng: -77.3832 }; // Belleville coordinates
};

// Calculate distance between postal codes in kilometers
export const calculateDistanceBetweenPostalCodes = (
  postalCode1: string,
  postalCode2: string
): number | null => {
  const coords1 = getCoordinatesFromPostalCode(postalCode1);
  const coords2 = getCoordinatesFromPostalCode(postalCode2);

  if (!coords1 || !coords2) {
    return null;
  }

  // Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const dLon = ((coords2.lng - coords1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coords1.lat * Math.PI) / 180) *
      Math.cos((coords2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if postal code is within service radius from office
export const isPostalCodeWithinServiceRadius = (
  postalCode: string,
  radiusKm: number = 75
): { withinRadius: boolean; distance: number | null; message: string } => {
  const distance = calculateDistanceBetweenPostalCodes(postalCode, OFFICE_POSTAL_CODE);

  if (distance === null) {
    return {
      withinRadius: false,
      distance: null,
      message: "Unable to verify postal code. Please check the format.",
    };
  }

  if (distance > radiusKm) {
    return {
      withinRadius: false,
      distance: Math.round(distance),
      message: `We currently only service within ${radiusKm}km of our central office. Please contact us for special requests.`,
    };
  }

  return {
    withinRadius: true,
    distance: Math.round(distance),
    message: `Address is within our ${radiusKm}km service area.`,
  };
};

// PSW Check-in proximity threshold in meters
export const PSW_CHECKIN_PROXIMITY_METERS = 200;

// Calculate distance between two GPS coordinates in meters
export const calculateDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if PSW is within check-in proximity of client address
export const isPSWWithinCheckInProximity = (
  pswLat: number,
  pswLng: number,
  clientLat: number,
  clientLng: number
): { withinProximity: boolean; distance: number; message: string } => {
  const distance = calculateDistanceInMeters(pswLat, pswLng, clientLat, clientLng);

  if (distance > PSW_CHECKIN_PROXIMITY_METERS) {
    return {
      withinProximity: false,
      distance: Math.round(distance),
      message: "You must be at the client's location to check in. If you are having GPS issues, contact the office.",
    };
  }

  return {
    withinProximity: true,
    distance: Math.round(distance),
    message: "Location verified. You can check in.",
  };
};

// Check if client postal code is within any approved PSW's 75km service radius
export const isWithinAnyPSWCoverage = (
  clientPostalCode: string,
  radiusKm: number = 75
): { 
  withinCoverage: boolean; 
  closestDistance: number | null; 
  nearestPSWCity: string | null;
  message: string;
} => {
  // Import dynamically to avoid circular dependency
  const stored = localStorage.getItem("pswdirect_psw_profiles");
  if (!stored) {
    return {
      withinCoverage: false,
      closestDistance: null,
      nearestPSWCity: null,
      message: "No PSWs available in our system yet. Please check back soon.",
    };
  }

  let profiles;
  try {
    profiles = JSON.parse(stored);
  } catch {
    return {
      withinCoverage: false,
      closestDistance: null,
      nearestPSWCity: null,
      message: "Error checking coverage. Please try again.",
    };
  }

  // Filter to approved PSWs with valid home postal codes
  const approvedPSWs = profiles.filter(
    (p: { vettingStatus: string; homePostalCode?: string }) => 
      p.vettingStatus === "approved" && 
      p.homePostalCode && 
      isValidCanadianPostalCode(p.homePostalCode)
  );

  if (approvedPSWs.length === 0) {
    return {
      withinCoverage: false,
      closestDistance: null,
      nearestPSWCity: null,
      message: "We don't currently have approved PSWs in our system. Please check back soon.",
    };
  }

  // Calculate distance to each PSW's home location
  let closestDistance: number | null = null;
  let nearestPSWCity: string | null = null;
  let withinCoverage = false;

  for (const psw of approvedPSWs) {
    const distance = calculateDistanceBetweenPostalCodes(clientPostalCode, psw.homePostalCode);
    
    if (distance !== null) {
      if (closestDistance === null || distance < closestDistance) {
        closestDistance = distance;
        nearestPSWCity = psw.homeCity || null;
      }
      
      if (distance <= radiusKm) {
        withinCoverage = true;
      }
    }
  }

  if (withinCoverage) {
    return {
      withinCoverage: true,
      closestDistance: closestDistance !== null ? Math.round(closestDistance) : null,
      nearestPSWCity,
      message: "Great news! We have PSWs available in your area.",
    };
  }

  return {
    withinCoverage: false,
    closestDistance: closestDistance !== null ? Math.round(closestDistance) : null,
    nearestPSWCity,
    message: `We don't currently have PSWs covering your area. Our nearest coverage is ${nearestPSWCity ? `in ${nearestPSWCity}` : "too far away"}. Check back soon as we're always expanding!`,
  };
};
