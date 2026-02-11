import { app } from '../app';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function exportSwagger() {
    console.log('Generating Swagger JSON...');

    // Elysia swagger plugin serves the JSON at /swagger/json by default
    const response = await app.handle(new Request('http://localhost/swagger/json'));

    if (!response.ok) {
        console.error('Failed to fetch swagger JSON');
        process.exit(1);
    }

    const swaggerJson = await response.json();

    const outputPath = join(process.cwd(), 'swagger.json');
    writeFileSync(outputPath, JSON.stringify(swaggerJson, null, 2));

    console.log(`✅ Swagger documentation exported to: ${outputPath}`);
    process.exit(0);
}

exportSwagger().catch(err => {
    console.error('Error exporting swagger:', err);
    process.exit(1);
});
