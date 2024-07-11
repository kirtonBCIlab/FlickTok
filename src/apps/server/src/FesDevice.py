#from serial.tools import list_ports
#from serial import Serial

#import asyncio


#class FesDevice:
#    def __init__(self):
#        self.__device: Serial | None = None

#    def is_available(self) -> bool:
#        return self.__device is not None

    #async def swipe(self):
        # TODO - this will cause a delay on the first swipe, consider putting into
        # a "connect" function.  Can't put into init unless we want that to be async.
    #    if self.__device is None:
    #        self.__device = await self.__find_fes_serial_device()

        # write to serial port to trigger swipe
    #    if self.__device:
    #        try:
    #            self.__device.write(b"1")
    #            print("swipe 1")

    #        except Exception as e:
    #            print("FesDevice: write failed due to ", e)
    #            self.__device = None

    #async def __find_fes_serial_device(self) -> Serial | None:
    #    print("FesDevice: searching com ports")
    #    for port in list_ports.comports():
    #        if port.pid == 29987:
    #            try:
    #                print("FesDevice: trying candidate: ", port.name)
    #                device = Serial(port.name, timeout=1.0, baudrate=115200)

                    # Need a bit of a delay for the device to connect
    #                await asyncio.sleep(1.0)

    #                device.write(b"?\r\n")
    #                response = device.readline()
    #                if response.startswith(b"FES_Box"):
    #                    device.timeout = 0.1
    #                    print("FesDevice: found!")
    #                    return device
    #                device.close()

    #            except Exception as e:
    #                print(f"FesDevice: {port.name} failed due to {e}")
    #    print("FesDevice: FES Box not found")


    ###EMILY TRY


import asyncio
from typing import Optional


class DummySerial:
    def __init__(self):
        self.is_open = True

    def close(self):
        self.is_open = False

    def write(self, data):
        print(f"Writing to dummy serial: {data}")

    def read(self, size=1):
        return b'\x00' * size

    def readline(self):
        return b'\n'


class FesDevice:
    def __init__(self):
        self._device: Optional[DummySerial] = None

    def is_available(self) -> bool:
        return self._device is not None
    
    async def swipe(self):
        self._device = await self.__find_fes_serial_device()
        print("swipe 1")
        print("swiped")

    async def __find_fes_serial_device(self) -> Optional[DummySerial]:
        device = DummySerial()
        print("FesDevice: found (demo)")
        return device

