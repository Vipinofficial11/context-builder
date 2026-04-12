const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found! Please create it from .env.example');
    process.exit(1);
  }

  const env = fs.readFileSync(envPath, 'utf8');
  const clientIdMatch = env.match(/CLIENT_ID=(.+)/);
  const clientId = clientIdMatch ? clientIdMatch[1].trim() : '';

  if (!clientId) {
    console.error('CLIENT_ID not found in .env file!');
    process.exit(1);
  }

  const templatePath = path.join(__dirname, 'manifest.template.json');
  let template = fs.readFileSync(templatePath, 'utf8');
  template = template.replace('__CLIENT_ID__', clientId);

  const manifestPath = path.join(__dirname, 'manifest.json');
  fs.writeFileSync(manifestPath, template);
  console.log('manifest.json generated successfully!');
} catch (error) {
  console.error('Error generating manifest.json:', error);
  process.exit(1);
}
