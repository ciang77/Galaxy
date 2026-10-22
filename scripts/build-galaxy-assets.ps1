$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repoRoot = Split-Path $PSScriptRoot -Parent
$assetDir = Join-Path $repoRoot 'assets\galaxy'
$spriteDir = Join-Path $assetDir 'sprites'
$svgDir = Join-Path $repoRoot 'assets\svg'
$sheet = [System.Drawing.Bitmap]::FromFile((Join-Path $assetDir 'galaxy-character-sheet-clean-v2.png'))
$columns = [int[]](0,444,887,1331,1774)
$names = @('idle','thinking','working','complete','alert','sleeping','waking','wave')
try {
  for ($index=0; $index -lt $names.Count; $index++) {
    $col = $index % 4
    $row = [Math]::Floor($index / 4)
    $x = $columns.GetValue($col)
    $width = $columns.GetValue($col+1) - $x
    $y = if ($row -eq 0) { 0 } else { 470 }
    $height = if ($row -eq 0) { 461 } else { 417 }
    $frame = [System.Drawing.Bitmap]::new(512,512,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($frame)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $ratio = [Math]::Min(480.0/$width,480.0/$height)
      $drawWidth = [int]($width*$ratio)
      $drawHeight = [int]($height*$ratio)
      $destination = [System.Drawing.Rectangle]::new([int]((512-$drawWidth)/2),496-$drawHeight,$drawWidth,$drawHeight)
      $source = [System.Drawing.Rectangle]::new($x,$y,$width,$height)
      $graphics.DrawImage($sheet,$destination,$source,[System.Drawing.GraphicsUnit]::Pixel)
      $frame.Save((Join-Path $spriteDir ($names[$index]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
      $frame.Save((Join-Path $svgDir ('galaxy-'+$names[$index]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $frame.Dispose() }
  }
} finally { $sheet.Dispose() }

$iconSource = [System.Drawing.Bitmap]::FromFile((Join-Path $assetDir 'galaxy-icon-source.png'))
$images = @()
try {
  foreach ($size in @(16,32,48,64,128,256)) {
    $bitmap = [System.Drawing.Bitmap]::new($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $stream = [System.IO.MemoryStream]::new()
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.DrawImage($iconSource,0,0,$size,$size)
      $bitmap.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png)
      $images += ,@{Size=$size; Bytes=$stream.ToArray()}
      if ($size -eq 256) { $bitmap.Save((Join-Path $assetDir 'icon.png'),[System.Drawing.Imaging.ImageFormat]::Png) }
    } finally { $stream.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
  }
} finally { $iconSource.Dispose() }
$stream = [System.IO.MemoryStream]::new()
$writer = [System.IO.BinaryWriter]::new($stream)
try {
  $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$images.Count)
  $offset = 6 + 16*$images.Count
  foreach ($item in $images) {
    $dimension = if ($item.Size -eq 256) { 0 } else { $item.Size }
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$item.Bytes.Length); $writer.Write([uint32]$offset)
    $offset += $item.Bytes.Length
  }
  foreach ($item in $images) { $writer.Write([byte[]]$item.Bytes) }
  [System.IO.File]::WriteAllBytes((Join-Path $assetDir 'icon.ico'),$stream.ToArray())
} finally { $writer.Dispose(); $stream.Dispose() }

Write-Output 'Galaxy: normalized eight transparent sprites and generated a six-size Windows icon.'
