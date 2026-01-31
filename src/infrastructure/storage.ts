import { supabaseAdmin as supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';

export class StorageService {
    private bucketName = 'payment-proofs';

    async uploadProof(file: File, userId: string): Promise<string> {
        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${timestamp}.${fileExt}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(this.bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw new DomainError('Error uploading file: ' + error.message, 'STORAGE_ERROR', 500);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(data.path);

        return urlData.publicUrl;
    }

    // Alias for uploadProof
    async uploadPaymentProof(file: File, userId: string): Promise<string> {
        return this.uploadProof(file, userId);
    }

    async deleteProof(url: string): Promise<void> {
        // Extract path from URL
        const path = url.split(`${this.bucketName}/`)[1];
        if (!path) return;

        const { error } = await supabase.storage
            .from(this.bucketName)
            .remove([path]);

        if (error) {
            throw new DomainError('Error deleting file: ' + error.message, 'STORAGE_ERROR', 500);
        }
    }
}
