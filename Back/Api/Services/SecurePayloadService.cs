using Api.Helpers;

namespace Api.Services
{
    public class SecurePayloadService
    {
        public string CompressAndEncrypt(string data)
        {
            var compressedData = CompressionHelper.Compress(data);
            var encryptedData = new EncryptionHelper().Encrypt(compressedData);

            return encryptedData;
        }

        public string DecryptAndDecompress(string data)
        {
            var decryptedData = new EncryptionHelper().Decrypt(data);
            var decompressedData = CompressionHelper.Decompress(decryptedData);

            return decompressedData;
        }
    }
}