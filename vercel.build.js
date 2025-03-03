const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to add exports to API routes
function ensureApiRoutesAreDynamic() {
  console.log('Ensuring all API routes are properly configured as dynamic...');
  
  const apiDir = path.join(process.cwd(), 'app', 'api');
  if (!fs.existsSync(apiDir)) {
    console.log('No API directory found, skipping.');
    return;
  }
  
  // Walk through all subdirectories in the api folder
  function processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Process subdirectories recursively
        processDirectory(fullPath);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        // For route files, ensure they have the dynamic exports
        let content = fs.readFileSync(fullPath, 'utf8');
        
        const dynamicExports = [
          "export const dynamic = 'force-dynamic';",
          "export const fetchCache = 'force-no-store';",
          "export const revalidate = 0;",
          "export const runtime = 'nodejs';",
          "export const preferredRegion = 'auto';",
        ].join('\n');
        
        // Only add the exports if they don't already exist
        if (!content.includes('export const dynamic')) {
          // Insert the exports at the top of the file
          const lines = content.split('\n');
          const insertPosition = lines.findIndex(line => 
            line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('import')
          );
          
          if (insertPosition !== -1) {
            lines.splice(insertPosition, 0, dynamicExports);
            content = lines.join('\n');
            fs.writeFileSync(fullPath, content);
            console.log(`Updated ${fullPath} to be dynamic`);
          }
        }
      }
    }
  }
  
  processDirectory(apiDir);
  console.log('API routes configuration complete.');
}

// Main build script
async function build() {
  try {
    console.log('Starting custom build process...');
    
    // 1. Ensure database URL is set
    if (!process.env.DATABASE_URL) {
      console.warn('WARNING: DATABASE_URL is not set in environment variables!');
    }
    
    // 2. Update API routes
    ensureApiRoutesAreDynamic();
    
    // 3. Run the Next.js build
    console.log('Building Next.js application...');
    execSync('next build', { stdio: 'inherit' });
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build(); 