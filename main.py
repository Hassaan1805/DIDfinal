from Crypto.Cipher import DES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import base64

# DES key must be exactly 8 bytes
key = b'8bytekey'  # 8 bytes only
iv = get_random_bytes(8)  # DES block size = 8 bytes

# Create cipher
cipher = DES.new(key, DES.MODE_CBC, iv)

data = b"DES executed by Zaid"

# Encrypt
ciphertext = cipher.encrypt(pad(data, DES.block_size))
print("Encrypted:", base64.b64encode(ciphertext))

# Decrypt
cipher = DES.new(key, DES.MODE_CBC, iv)
decrypted = unpad(cipher.decrypt(ciphertext), DES.block_size)

print("Decrypted:", decrypted.decode())
