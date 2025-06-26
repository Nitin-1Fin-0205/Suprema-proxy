// MatcherIdentify.cs
// C# Console App for 1:N Fingerprint Identification using UFMatcher.dll

using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Collections.Generic;

class MatcherIdentify
{
    const int MAX_TEMPLATE_SIZE = 1024;
    const int MAX_TEMPLATES = 1000;

    [DllImport("UFMatcher.dll")]
    private static extern int UFM_Create(ref IntPtr hMatcher);

    [DllImport("UFMatcher.dll")]
    private static extern int UFM_Delete(IntPtr hMatcher);

    [DllImport("UFMatcher.dll")]
    private static extern int UFM_Identify(
        IntPtr hMatcher,
        byte[] probeTemplate,
        int probeSize,
        IntPtr[] galleryTemplates,
        int[] gallerySizes,
        int galleryCount,
        int timeoutMs,
        ref int matchedIndex
    );

    static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("-1");
            return 1;
        }

        string probePath = args[0];
        string galleryListPath = args[1];

        if (!File.Exists(probePath) || !File.Exists(galleryListPath))
        {
            Console.WriteLine("-1");
            return 1;
        }

        byte[] probeTemplate = File.ReadAllBytes(probePath);
        string[] galleryPaths = File.ReadAllLines(galleryListPath);

        List<byte[]> templates = new List<byte[]>();
        List<int> sizes = new List<int>();
        List<IntPtr> unmanagedPointers = new List<IntPtr>();

        try
        {
            foreach (var path in galleryPaths)
            {
                if (File.Exists(path))
                {
                    byte[] tpl = File.ReadAllBytes(path);
                    IntPtr unmanaged = Marshal.AllocHGlobal(tpl.Length);
                    Marshal.Copy(tpl, 0, unmanaged, tpl.Length);

                    templates.Add(tpl);
                    unmanagedPointers.Add(unmanaged);
                    sizes.Add(tpl.Length);
                }
            }

            IntPtr hMatcher = IntPtr.Zero;
            int res = UFM_Create(ref hMatcher);
            if (res != 0 || hMatcher == IntPtr.Zero)
            {
                Console.WriteLine("-1");
                return 1;
            }

            int matchedIndex = -1;
            res = UFM_Identify(hMatcher, probeTemplate, probeTemplate.Length,
                unmanagedPointers.ToArray(), sizes.ToArray(), templates.Count, 5000, ref matchedIndex);

            UFM_Delete(hMatcher);

            Console.WriteLine(matchedIndex);
            return 0;
        }
        catch
        {
            Console.WriteLine("-1");
            return 1;
        }
        finally
        {
            foreach (var ptr in unmanagedPointers)
            {
                Marshal.FreeHGlobal(ptr);
            }
        }
    }
}
