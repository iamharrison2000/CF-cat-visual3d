from http.server import SimpleHTTPRequestHandler, HTTPServer

class CustomHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        '.jvd': 'text/xml',
        '.jvx': 'text/xml',
        '.html': 'text/html',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '': 'application/octet-stream',  # Default
    }

if __name__ == "__main__":
    port_num = 8020
    server_address = ('', port_num )
    httpd = HTTPServer(server_address, CustomHandler)
    print(f"Serving on port {port_num}")
    httpd.serve_forever()
