using System.IO.Compression;
using System.Text;

namespace Api.Helpers
{
    public static class CompressionHelper
    {
        public static string Compress(string data)
        {
            var convertedData = Encoding.UTF8.GetBytes(data);
            using var output = new MemoryStream();
            using (var gzip = new GZipStream(output, CompressionMode.Compress))
            {
                gzip.Write(convertedData, 0, convertedData.Length);
            }

            return Convert.ToBase64String(output.ToArray());
        }
        public static string Decompress(string data)
        {
            var convertedData = Encoding.UTF8.GetBytes(data);
            using var input = new MemoryStream(convertedData);
            using var gzip = new GZipStream(input, CompressionMode.Decompress);
            using var output = new StreamReader(gzip, Encoding.UTF8);
            return output.ReadToEnd();
        }
    }
}
