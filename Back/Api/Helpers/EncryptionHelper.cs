using System.Security.Cryptography;
using System.Text;
using Api.Models;
using Microsoft.Extensions.Options;

namespace Api.Helpers
{
    public class EncryptionHelper
    {
        private readonly byte[] _key;

        public EncryptionHelper()
        {
            var configuration = new ConfigurationManager();
            configuration.SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
            
            var aesEncryptionKey = configuration.GetValue<string>("EncryptionSettings:AesEncryptionKey");

            if (string.IsNullOrEmpty(aesEncryptionKey))
            {
                throw new ArgumentNullException(nameof(aesEncryptionKey), "AES encryption key is not configured.");
            }
            
            _key = Encoding.UTF8.GetBytes(aesEncryptionKey);

            if (_key.Length != 32)
            {
                throw new ArgumentException("AES encryption key must be 32 bytes long for AES-256.");
            }
        }
        public string Encrypt(string data)
        {
            var convertedData = Encoding.UTF8.GetBytes(data);
            using var aes = Aes.Create();
            aes.Key = _key;
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor();
            var encryptedData = encryptor.TransformFinalBlock(convertedData, 0, convertedData.Length);

            var result = new byte[aes.IV.Length + encryptedData.Length];
            Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
            Buffer.BlockCopy(encryptedData, 0 , result, aes.IV.Length, encryptedData.Length);

            return Convert.ToBase64String(result);
        }

        public string Decrypt(string data)
        {
            var convertedData = Convert.FromBase64String(data);
            using var aes = Aes.Create();
            aes.Key = _key;
            
            var iv = new byte[aes.BlockSize / 8];
            var cipherText = new byte[convertedData.Length - iv.Length];
            Buffer.BlockCopy(convertedData, 0, iv, 0, iv.Length);
            Buffer.BlockCopy(convertedData, iv.Length, cipherText, 0, cipherText.Length);
            
            aes.IV = iv;
            
            using var decryptor = aes.CreateDecryptor();
            var decryptedData = decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);
            
            return Encoding.UTF8.GetString(decryptedData);
        }
    }
}
