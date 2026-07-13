import { join } from 'path';

/**
 * On Azure App Service Linux, /home/site/wwwroot is read-only (zip deploy).
 * Uploads must go to /home/ which is the only writable persistent volume.
 * Locally, use ./uploads relative to cwd.
 */
export function getUploadRoot(): string {
    if (process.env.WEBSITE_INSTANCE_ID) {
        // Running on Azure App Service
        return '/home/uploads';
    }
    return join(process.cwd(), 'uploads');
}
