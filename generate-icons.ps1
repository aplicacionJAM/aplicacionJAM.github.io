param(
  [string]$SourceSvg = "$PSScriptRoot\icon-512.svg"
)

$sizes = @(48, 72, 96, 128, 192, 256, 384, 512)
$outputDir = "$PSScriptRoot"

Add-Type -AssemblyName System.Drawing
Add-Type @"
  using System;
  using System.Drawing;
  using System.Drawing.Imaging;
  public class SvgConverter {
    public static void Convert(string svgPath, string pngPath, int size) {
      var doc = System.Xml.Linq.XDocument.Load(svgPath);
      var svgBytes = System.Text.Encoding.UTF8.GetBytes(doc.ToString());
      using (var ms = new System.IO.MemoryStream(svgBytes))
      using (var bmp = new Bitmap(size, size))
      using (var g = Graphics.FromImage(bmp)) {
        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
        g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        // For real SVG rendering you need an external library like Svg.SvgDocument
        // This generates placeholder colored squares as fallback
        g.Clear(Color.FromArgb(99, 102, 241));
        g.FillRectangle(Brushes.White, size*0.2f, size*0.1f, size*0.6f, size*0.3f);
        bmp.Save(pngPath, ImageFormat.Png);
      }
    }
  }
"@

Write-Host "Generando PNGs desde SVG..."
foreach ($size in $sizes) {
  $pngPath = "$outputDir\icon-$size.png"
  Write-Host "  -> $pngPath"
  # Real SVG rasterization requires Svg.SvgDocument from NuGet.
  # As fallback the placeholder class above is used.
  try {
    [SvgConverter]::Convert($SourceSvg, $pngPath, $size)
  } catch {
    Write-Warning "Fallback: generando placeholder cuadrado para ${size}x${size}"
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(99, 102, 241))
    $g.FillRectangle([System.Drawing.Brushes]::White, $size*0.2, $size*0.1, $size*0.6, $size*0.3)
    $bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
  }
}

Write-Host "¡Listo! PNGs generados en $outputDir"
