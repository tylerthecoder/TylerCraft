.PHONY: build

build:
	emcc --bind terrain-bindings.cpp -std=c++11 -o build/terrain.js -s MODULARIZE -s EXPORTED_RUNTIME_METHODS=['ccall']

build-test:
	emcc test2.cpp -o build/terrain2.js -s MODULARIZE -s EXPORTED_RUNTIME_METHODS=['ccall']

build-gcc:
	gcc terrain.cpp -o build/terrain-cpp

