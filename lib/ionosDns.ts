import axios from 'axios';

// IONOS API base URL
const IONOS_API_BASE_URL = 'https://api.ionos.com/dns/v1';

// Retrieve API key from environment variables
const IONOS_API_KEY = process.env.IONOS_API_KEY;

if (!IONOS_API_KEY) {
  throw new Error('IONOS_API_KEY environment variable is not set. Please set it in your .env.local file.');
}

// Configure axios instance with API key header
const ionosApiClient = axios.create({
  baseURL: IONOS_API_BASE_URL,
  headers: {
    'X-API-Key': IONOS_API_KEY,
    'Content-Type': 'application/json',
  },
});

/**
 * List all DNS zones
 * @returns Promise containing an array of DNS zones
 */
export async function listZones(): Promise<any> {
  try {
    const response = await ionosApiClient.get('/zones');
    console.log('Retrieved DNS zones:', response.data.zones.length);
    return response.data.zones;
  } catch (error: any) {
    console.error('Error listing DNS zones:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * List DNS records for a specific zone
 * @param zoneId - The ID of the zone to list records for
 * @returns Promise containing an array of DNS records
 */
export async function listRecords(zoneId: string): Promise<any> {
  try {
    const response = await ionosApiClient.get(`/zones/${zoneId}/records`);
    console.log(`Retrieved DNS records for zone ${zoneId}:`, response.data.records.length);
    return response.data.records;
  } catch (error: any) {
    console.error(`Error listing DNS records for zone ${zoneId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Delete a specific DNS record
 * @param zoneId - The ID of the zone containing the record
 * @param recordId - The ID of the record to delete
 * @returns Promise indicating success or failure
 */
export async function deleteRecord(zoneId: string, recordId: string): Promise<void> {
  try {
    await ionosApiClient.delete(`/zones/${zoneId}/records/${recordId}`);
    console.log(`Successfully deleted DNS record ${recordId} from zone ${zoneId}`);
  } catch (error: any) {
    console.error(`Error deleting DNS record ${recordId} from zone ${zoneId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Add or update a DNS record
 * @param zoneId - The ID of the zone to add or update the record in
 * @param recordData - The data for the DNS record (name, type, content, ttl, etc.)
 * @param recordId - Optional ID of the record to update; if not provided, a new record is created
 * @returns Promise containing the created or updated record data
 */
export async function upsertRecord(zoneId: string, recordData: {
  name: string;
  type: string;
  content: string;
  ttl?: number;
  priority?: number;
}, recordId?: string): Promise<any> {
  try {
    const method = recordId ? 'put' : 'post';
    const url = recordId ? `/zones/${zoneId}/records/${recordId}` : `/zones/${zoneId}/records`;
    const response = await ionosApiClient({
      method,
      url,
      data: recordData,
    });
    console.log(`${recordId ? 'Updated' : 'Created'} DNS record for zone ${zoneId}:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`${recordId ? 'Error updating' : 'Error creating'} DNS record for zone ${zoneId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Utility function to find and delete specific TXT records by name (e.g., _lovable, _lovable-email)
 * @param zoneId - The ID of the zone to search for records
 * @param recordNames - Array of record names to delete (e.g., ['_lovable', '_lovable-email'])
 * @returns Promise indicating the deletion results
 */
export async function deleteRecordsByName(zoneId: string, recordNames: string[]): Promise<void> {
  try {
    const records = await listRecords(zoneId);
    const recordsToDelete = records.filter((record: any) =>
      recordNames.some(name => record.name.includes(name))
    );

    if (recordsToDelete.length === 0) {
      console.log(`No records found matching names: ${recordNames.join(', ')} in zone ${zoneId}`);
      return;
    }

    for (const record of recordsToDelete) {
      await deleteRecord(zoneId, record.id);
    }
  } catch (error: any) {
    console.error(`Error deleting records by name in zone ${zoneId}:`, error.response?.data || error.message);
    throw error;
  }
}

// Export default for easy import
export default {
  listZones,
  listRecords,
  deleteRecord,
  upsertRecord,
  deleteRecordsByName,
};
