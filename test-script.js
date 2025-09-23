import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  // Set the number of virtual users (VUs) to 1000
  vus: 10, 
  // The test will run for a duration of 30 seconds
  duration: '10s',
};

export default function () {
  // The URL of the API endpoint you want to test
  const url = 'http://192.168.100.8:5002/api/analyticsRoutes/search?q=License'; 
  
  // Make the HTTP GET request
  http.get(url);
  
  // Pause for a short duration to simulate user behavior
  sleep(1);
}