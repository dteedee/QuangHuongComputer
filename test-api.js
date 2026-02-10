const API_BASE = 'http://localhost:3000/api';

// Test API endpoints
async function testAPI() {
  console.log('🚀 Testing API endpoints...\n');
  
  // Test GET properties
  try {
    const response = await fetch(`${API_BASE}/properties`);
    const data = await response.json();
    console.log('✅ Properties API:', data.success ? 'OK' : 'Error');
    console.log('   Total properties:', data.pagination?.total || 'N/A');
  } catch (error) {
    console.log('❌ Properties API: Error -', error.message);
  }
  
  // Test GET locations
  try {
    const response = await fetch(`${API_BASE}/locations`);
    const data = await response.json();
    console.log('✅ Locations API:', data.success ? 'OK' : 'Error');
    console.log('   Total locations:', data.pagination?.total || 'N/A');
  } catch (error) {
    console.log('❌ Locations API: Error -', error.message);
  }
  
  // Test GET types
  try {
    const response = await fetch(`${API_BASE}/types`);
    const data = await response.json();
    console.log('✅ Types API:', data.success ? 'OK' : 'Error');
    console.log('   Total types:', data.data?.length || 'N/A');
  } catch (error) {
    console.log('❌ Types API: Error -', error.message);
  }
  
  // Test GET facilities
  try {
    const response = await fetch(`${API_BASE}/facilities`);
    const data = await response.json();
    console.log('✅ Facilities API:', data.success ? 'OK' : 'Error');
    console.log('   Total facilities:', data.data?.length || 'N/A');
  } catch (error) {
    console.log('❌ Facilities API: Error -', error.message);
  }
  
  // Test GET neighborhoods
  try {
    const response = await fetch(`${API_BASE}/neighborhoods`);
    const data = await response.json();
    console.log('✅ Neighborhoods API:', data.success ? 'OK' : 'Error');
    console.log('   Total neighborhoods:', data.pagination?.total || 'N/A');
  } catch (error) {
    console.log('❌ Neighborhoods API: Error -', error.message);
  }
}

testAPI().catch(console.error);