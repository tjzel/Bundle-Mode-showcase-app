import { Canvas, useCanvasEffect } from 'react-native-wgpu';
import {
  BoxGeometry,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
} from 'three';
import { Button, StyleSheet, View } from 'react-native';
import { initWebGPU, makeWebGPURenderer, useBusyJS } from './utils';
import { runOnUI } from 'react-native-worklets';

export default function App() {
  const ref = useCanvasEffect(async () => {
    const context = ref.current!.getContext('webgpu')!;
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter?.requestDevice();

    initWebGPU();

    runOnUI(async () => {
      'worklet';

      const { width, height } = context.canvas as typeof context.canvas & {
        width: number;
        height: number;
      };

      const camera = new PerspectiveCamera(50, width / height, 0.01, 10);
      camera.position.z = 1;

      const scene = new Scene();
      const geometry = new BoxGeometry(0.2, 0.2, 0.2);
      const material = new MeshNormalMaterial();
      const mesh = new Mesh(geometry, material);
      scene.add(mesh);

      const renderer = makeWebGPURenderer(context, device);
      await renderer.init();

      let lastTimestamp = 0;

      function animate(timestamp: number) {
        if (lastTimestamp === 0) {
          lastTimestamp = timestamp;
          return;
        }

        const delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        const rotationPerMs = (Math.PI * 2) / 8 / 1000;

        mesh.rotation.x += rotationPerMs * delta;
        mesh.rotation.y += rotationPerMs * delta;
        mesh.rotation.z += rotationPerMs * delta;

        renderer.render(scene, camera);
        context.present();
      }

      renderer.setAnimationLoop(animate);

      globalThis.CubeRenderer = renderer;
    })();

    return () => {
      runOnUI(() => {
        'worklet';
        const Renderer = globalThis.CubeRenderer!;

        Renderer.setAnimationLoop(null);
        Renderer.dispose();
      })();
    };
  });

  const toggleBusyJS = useBusyJS();

  return (
    <>
      <View style={styles.buttonContainer}>
        <Button title={'Toggle busy JS'} onPress={toggleBusyJS} />
      </View>
      <Canvas ref={ref} style={styles.gpu} />
    </>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    paddingTop: '50%',
  },
  gpu: {
    flex: 1,
  },
});
