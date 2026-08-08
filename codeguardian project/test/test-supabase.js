// Quick test: Check what Supabase actually returns
const https = require('https');

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeXppeGt0eXRtanRiZG1sbnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTY4MzUsImV4cCI6MjA5MTY3MjgzNX0.ynwJfvOug_l0QvXBTY1CrCBli-MOyfOu0H1W2Z57-4k';

function testEndpoint(path, accept) {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'khyzixktytmjtbdmlnut.supabase.co',
            path,
            method: 'GET',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'Accept': accept || 'application/json',
            },
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                console.log(`\n--- ${path} (Accept: ${accept || 'application/json'}) ---`);
                console.log(`Status: ${res.statusCode}`);
                console.log(`Body: ${data.substring(0, 300)}`);
                resolve();
            });
        });
        req.on('error', (e) => { console.log(`Error: ${e.message}`); resolve(); });
        req.setTimeout(10000, () => { req.destroy(); console.log('Timeout'); resolve(); });
        req.end();
    });
}

async function main() {
    console.log('=== Supabase Connection Test ===\n');
    
    // Test 1: Root endpoint with JSON
    await testEndpoint('/rest/v1/', 'application/json');
    
    // Test 2: Root endpoint with OpenAPI
    await testEndpoint('/rest/v1/', 'application/openapi+json');
    
    // Test 3: Health endpoint
    await testEndpoint('/rest/v1/health', 'application/json');
    
    // Test 4: Auth health
    await testEndpoint('/auth/v1/health', 'application/json');
    
    console.log('\n=== Done ===');
}

main();
