from serial.tools import list_ports
from serial import Serial
import asyncio

class FesDevice:
    def __init__(self):
        self.__device = None

    def is_available(self):
        return self.__device is not None

    async def swipe(self):
        if self.__device is None:
            self.__device = await self.__find_fes_serial_device()

        if self.__device:
            try:
                self.__device.write(b"1")
            except Exception as e:
                print("FesDevice: write failed due to ", e)
                self.__device = None

    async def __find_fes_serial_device(self):
        print("FesDevice: searching com ports")
        for port in list_ports.comports():
            if port.pid == 29987:
                try:
                    print("FesDevice: trying candidate: ", port.name)
                    device = Serial(port.name, timeout=1.0, baudrate=115200)
                    await asyncio.sleep(3)
                    device.write(b"?\r\n")
                    response = device.readline()
                    if response.startswith(b"FES_Box"):
                        device.timeout = 0.1
                        print("FesDevice: found!")
                        return device
                    device.close()
                except Exception as e:
                    print(f"FesDevice: {port.name} failed due to {e}")
        print("FesDevice: FES Box not found")
        return None
