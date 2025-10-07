using System;
using System.IO;
using Suprema;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace BiometricAgent
{
    class Program
    {
        // ====== CONSTANTS ======
        private const int DefaultBrightness = 100;
        private const int DefaultSensitivity = 3;
        private const bool DefaultDetectCore = false;
        private const int DefaultTimeout = 10000; // ms
        private const int DefaultTemplateType = 2001;
        private const int MaxTemplateSize = 1024;
        // ========================

        static void Main(string[] args)
        {
            if (args.Length == 0 || args[0] == "capture")
            {
                // If a session directory is provided as the second argument, use it
                string sessionDir = (args.Length > 1) ? args[1] : null;
                CaptureAndExtract(sessionDir);
                return;
            }
            switch (args[0])
            {
                case "deviceInfo":
                    DeviceInfo();
                    break;
                case "listDevices":
                    ListDevices();
                    break;
                case "verify":
                    if (args.Length < 3) { Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = "Need 2 template paths" })); return; }
                    Verify(args[1], args[2]);
                    break;
                case "identify":
                    if (args.Length < 3) { Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = "Need probe and gallery list" })); return; }
                    Identify(args[1], args[2]);
                    break;
                case "quality":
                    if (args.Length < 3) { Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = "Need mode and path" })); return; }
                    Quality(args[1], args[2]);
                    break;
                case "createSession":
                    CreateSession();
                    break;
                case "cleanupSession":
                    if (args.Length < 2) { Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = "Need sessionId" })); return; }
                    CleanupSession(args[1]);
                    break;
                default:
                    Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = "Unknown command" }));
                    break;
            }
        }

        static void CaptureAndExtract(string sessionDir = null)
        {
            try
            {
                UFScannerManager scannerManager = new UFScannerManager(null);
                var initRes = scannerManager.Init();
                if (initRes != UFS_STATUS.OK || scannerManager.Scanners.Count == 0)
                {
                    Console.WriteLine("ERROR: No scanner found or failed to initialize. Status: " + initRes);
                    Environment.Exit(1);
                }
                UFScanner scanner = scannerManager.Scanners[0];
                scanner.Brightness = DefaultBrightness;
                scanner.Sensitivity = DefaultSensitivity;
                scanner.DetectCore = DefaultDetectCore;
                scanner.Timeout = DefaultTimeout;
                scanner.nTemplateType = DefaultTemplateType;
                Console.WriteLine("Place finger on scanner...");
                var capRes = scanner.CaptureSingleImage();
                if (capRes != UFS_STATUS.OK)
                {
                    UFScanner.GetErrorString(capRes, out string errStr);
                    Console.WriteLine("ERROR: Capture failed: " + errStr);
                    Environment.Exit(1);
                }
                Console.WriteLine("Image captured.");
                // Determine output directory
                string outDir = string.IsNullOrEmpty(sessionDir) ? Directory.GetCurrentDirectory() : sessionDir;
                Directory.CreateDirectory(outDir);
                string bmpPath = Path.Combine(outDir, "fingerprint.bmp");
                var saveRes = scanner.SaveCaptureImageBufferToBMP(bmpPath);
                if (saveRes != UFS_STATUS.OK)
                {
                    UFScanner.GetErrorString(saveRes, out string errStr);
                    Console.WriteLine("ERROR: Save BMP failed: " + errStr);
                }
                else
                {
                    Console.WriteLine("Fingerprint image saved to " + bmpPath);
                }
                byte[] template = new byte[MaxTemplateSize];
                int templateSize, enrollQuality;
                var extRes = scanner.ExtractEx(MaxTemplateSize, template, out templateSize, out enrollQuality);
                if (extRes != UFS_STATUS.OK)
                {
                    UFScanner.GetErrorString(extRes, out string errStr);
                    Console.WriteLine("ERROR: Template extraction failed: " + errStr);
                    Environment.Exit(1);
                }
                string tplPath = Path.Combine(outDir, "fingerprint.tpl");
                // Write only the valid template bytes, not the whole buffer
                using (var fs = new FileStream(tplPath, FileMode.Create, FileAccess.Write))
                {
                    fs.Write(template, 0, templateSize);
                }
                Console.WriteLine($"Fingerprint template saved to {tplPath}, quality={enrollQuality}");
                scannerManager.Uninit();
                Console.WriteLine("MatcherCapture: Done.");
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR: {ex.Message}");
                Environment.Exit(1);
            }
        }

        static void DeviceInfo()
        {
            try
            {
                UFScannerManager scannerManager = new UFScannerManager(null);
                scannerManager.Init();
                var info = new List<object>();
                for (int i = 0; i < scannerManager.Scanners.Count; i++)
                {
                    UFScanner scanner = scannerManager.Scanners[i];
                    info.Add(new
                    {
                        ID = scanner.ID,
                        Serial = scanner.Serial
                    });
                }
                scannerManager.Uninit();
                Console.WriteLine(JsonConvert.SerializeObject(info));
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = ex.Message }));
            }
        }

        static void ListDevices()
        {
            try
            {
                UFScannerManager scannerManager = new UFScannerManager(null);
                scannerManager.Init();
                var devices = new List<object>();
                for (int i = 0; i < scannerManager.Scanners.Count; i++)
                {
                    UFScanner scanner = scannerManager.Scanners[i];
                    devices.Add(new { ID = scanner.ID, Serial = scanner.Serial });
                }
                scannerManager.Uninit();
                Console.WriteLine(JsonConvert.SerializeObject(devices));
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = ex.Message }));
            }
        }

        static void Verify(string tpl1, string tpl2)
        {
            try
            {
                byte[] t1 = File.ReadAllBytes(tpl1);
                byte[] t2 = File.ReadAllBytes(tpl2);
                var matcher = new UFMatcher();
                bool match;
                var status = matcher.Verify(t1, t1.Length, t2, t2.Length, out match);
                Console.WriteLine(JsonConvert.SerializeObject(new { match = match, status = status.ToString() }));
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = ex.Message }));
            }
        }

        static void Identify(string probePath, string galleryListPath)
        {
            try
            {
                byte[] probe = File.ReadAllBytes(probePath);
                var galleryPaths = File.ReadAllLines(galleryListPath);
                var matcher = new UFMatcher();
                int matchIndex = -1;
                for (int i = 0; i < galleryPaths.Length; i++)
                {
                    byte[] tpl = File.ReadAllBytes(galleryPaths[i]);
                    bool match;
                    var status = matcher.Verify(probe, probe.Length, tpl, tpl.Length, out match);
                    if (match)
                    {
                        matchIndex = i;
                        break;
                    }
                }
                Console.WriteLine(JsonConvert.SerializeObject(new { matchIndex }));
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = ex.Message }));
            }
        }

        static void Quality(string mode, string path)
        {
            try
            {
                int quality = -1;
                if (mode == "image")
                {
                    byte[] img = File.ReadAllBytes(path);
                    // Use SDK's quality function if available, else dummy
                    quality = 80; // Replace with real SDK call
                }
                else if (mode == "template")
                {
                    byte[] tpl = File.ReadAllBytes(path);
                    // Use SDK's template quality function if available, else dummy
                    quality = 90; // Replace with real SDK call
                }
                Console.WriteLine(JsonConvert.SerializeObject(new { quality }));
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = ex.Message }));
            }
        }

        static void CreateSession()
        {
            try
            {
                // Generate a unique session ID (GUID)
                string sessionId = Guid.NewGuid().ToString();
                // Optionally, create a temp directory for the session
                string sessionDir = Path.Combine(Path.GetTempPath(), "biometric_session_" + sessionId);
                Directory.CreateDirectory(sessionDir);
                Console.WriteLine(JsonConvert.SerializeObject(new { sessionId, sessionDir }));
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = ex.Message }));
            }
        }

        static void CleanupSession(string sessionId)
        {
            try
            {
                string sessionDir = Path.Combine(Path.GetTempPath(), "biometric_session_" + sessionId);
                if (Directory.Exists(sessionDir))
                {
                    Directory.Delete(sessionDir, true);
                }
                Console.WriteLine(JsonConvert.SerializeObject(new { success = true }));
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonConvert.SerializeObject(new { success = false, error = ex.Message }));
            }
        }
    }
}
