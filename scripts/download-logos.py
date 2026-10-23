import urllib.request
import pathlib
import concurrent.futures

root = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'employers'
root.mkdir(parents=True, exist_ok=True)
# Logo sources explicitly supplied by Christopher. Other employer assets stay unchanged.
urls = {
    'bank-of-america.jpg': 'https://img.icons8.com/color/1200/bank-of-america.jpg',
    'frcc.svg': 'https://cccs.edu/wp-content/uploads/2024/04/FR_logo.svg',
    'transwest.svg': 'https://www.transwest.com/img/static/svg/5537b79d3fdf26e6.svg',
    'lumen.png': 'https://partner.zoom.com/wp-content/uploads/2024/04/Lumen-Logo-Blue_Black-RGB.png'
}
def download(pair):
    name, url = pair
    try:
        request = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=15) as response:
            data = response.read()
        is_image = data.startswith((b'\xff\xd8\xff', b'\x89PNG')) or (name.endswith('.svg') and b'<svg' in data[:2000])
        if not is_image:
            raise ValueError('The response is not the expected image')
        (root / name).write_bytes(data)
        return name + ': saved supplied logo from ' + url
    except Exception as error:
        raise RuntimeError(name + ': ' + str(error)) from error
with concurrent.futures.ThreadPoolExecutor() as executor:
    for result in executor.map(download, urls.items()):
        print(result)
