

async function testEmails() {
  console.log('🧪 Starting Email Delivery Tests...\n');
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || '';

  const runTest = async (testName, endpoint, method, payload, headers = {}) => {
    console.log(`Running: ${testName}...`);
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };
      
      if (payload) {
        options.body = JSON.stringify(payload);
      }

      const res = await fetch(`${baseUrl}${endpoint}`, options);
      
      // Handle non-JSON responses gracefully
      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
      
      if (res.ok) {
        console.log(`✅ Passed. (Status: ${res.status})`);
        console.log(`Response:`, data);
      } else {
        console.error(`❌ Failed. Expected success but got ${res.status}. Response:`, data);
      }
    } catch (err) {
      console.error(`❌ Failed with network error:`, err);
    }
    console.log('----------------------------------------\n');
  };

  // Test 1: Contact Form Submission
  await runTest('Test 1: Contact Form (New Lead Notification & Autoresponder)', '/api/contact', 'POST', {
    name: 'Email Delivery Test',
    phone: '9999999999',
    email: 'surojusantosh125@gmail.com', // Test recipient provided by user
    location: 'All',
    project: 'Not Sure',
    enquiryType: 'Site Visit',
    message: 'Testing email delivery (admin notification + autoresponder)',
    sourcePage: 'Automated Email Test Script'
  });

  // Test 2: Cron Job - Daily Leads
  await runTest('Test 2: Cron Job - Daily Leads Report', '/api/cron/daily-leads', 'GET', null, {
    'Authorization': `Bearer ${cronSecret}`
  });

  // Test 3: Cron Job - Leads Report
  await runTest('Test 3: Cron Job - Hourly/Periodic Leads Report', '/api/cron/leads-report', 'GET', null, {
    'Authorization': `Bearer ${cronSecret}`
  });

  console.log('🏁 All Email Tests Completed.');
}

testEmails();
