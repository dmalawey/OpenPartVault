// website/scripts/build-db.js
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoPartsDir = path.resolve(__dirname, '../../parts');
const publicPartsDir = path.resolve(__dirname, '../public/parts');
const outputJson = path.resolve(__dirname, '../public/models.json');

function buildDatabase() {
  const models = [];

  if (!fs.existsSync(repoPartsDir)) {
    console.error(`❌ Parts directory not found at ${repoPartsDir}`);
    process.exit(1);
  }

  // Ensure the destination public directory exists
  if (!fs.existsSync(publicPartsDir)) {
    fs.mkdirSync(publicPartsDir, { recursive: true });
  }

  const folders = fs.readdirSync(repoPartsDir);

  for (const folder of folders) {
    const folderPath = path.join(repoPartsDir, folder);
    
    // Skip normal files and the _template folder
    if (!fs.statSync(folderPath).isDirectory() || folder === '_template') {
      continue;
    }

    const metadataPath = path.join(folderPath, 'metadata.yaml');
    
    if (fs.existsSync(metadataPath)) {
      try {
        // 1. Parse Metadata
        const fileContents = fs.readFileSync(metadataPath, 'utf8');
        const data = yaml.load(fileContents);
        
        // Assign the folder name as the URL slug
        data.slug = folder;
        
        // 2. Map files and copy them to the public directory
        const destFolder = path.join(publicPartsDir, folder);
        if (!fs.existsSync(destFolder)) {
          fs.mkdirSync(destFolder, { recursive: true });
        }


        const filesInFolder = fs.readdirSync(folderPath);
        data.files = [];
        data.stlFiles = []; // Array to hold multiple STLs

        for (const file of filesInFolder) {
          const srcFile = path.join(folderPath, file);
          const destFile = path.join(destFolder, file);
          
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, destFile);
            data.files.push(file);
            
            // Check for STL and calculate size
            if (file.toLowerCase().endsWith('.stl')) {
              const stats = fs.statSync(srcFile);
              let sizeStr = '';
              if (stats.size > 1024 * 1024) {
                sizeStr = (stats.size / (1024 * 1024)).toFixed(1) + ' MB';
              } else {
                sizeStr = (stats.size / 1024).toFixed(0) + ' KB';
              }
              
              data.stlFiles.push({ name: file, size: sizeStr });
            }
            
            if (file.toLowerCase() === 'thumbnail.png') data.hasThumbnail = true;
          }
        }

        // Sort the STLs alphabetically by filename
        data.stlFiles.sort((a, b) => a.name.localeCompare(b.name));

        models.push(data);
        console.log(`✅ Processed: ${data.title} (${folder})`);
      } catch (e) {
        console.error(`❌ Error processing ${folder}:`, e);
      }
    } else {
      console.warn(`⚠️ Skipped ${folder}: No metadata.yaml found.`);
    }
  }

  // 3. Write the final database JSON
  fs.writeFileSync(outputJson, JSON.stringify(models, null, 2));
  console.log(`\n🎉 Successfully built models.json with ${models.length} parts!`);
}

buildDatabase();
