// Importation des bibliothèques et frameworks nécessaires
import { WebGPU } from 'webgpu';

// Définition des constantes et variables
const canvas = document.getElementById('canvas');
const device = await WebGPU.requestDevice();
const context = canvas.getContext('webgpu');
const swapChain = device.createSwapChain({
  device: device,
  format: 'bgra8unorm',
  width: canvas.width,
  height: canvas.height,
  usage: 'rendering',
});

// Création du pipeline de rendu
const pipeline = device.createRenderPipeline({
  vertexState: {
    module: device.createShaderModule({
      code: `
        struct VertexInput {
          [[location(0)]] position: vec4<f32>;
          [[location(1)]] color: vec4<f32>;
        };

        struct VertexOutput {
          [[builtin(position)]] position: vec4<f32>;
          [[location(0)]] color: vec4<f32>;
        };

        [[stage(vertex)]]
        fn main([[location(0)]] position: vec4<f32>, [[location(1)]] color: vec4<f32>) -> VertexOutput {
          return VertexOutput(position, color);
        }
      `,
    }),
    entryPoint: 'main',
    buffers: [
      {
        arrayStride: 4 * 4,
        stepMode: 'vertex',
        attributes: [
          {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x4',
          },
          {
            shaderLocation: 1,
            offset: 4 * 4,
            format: 'float32x4',
          },
        ],
      },
    ],
  },
  fragmentState: {
    module: device.createShaderModule({
      code: `
        [[stage(fragment)]]
        fn main([[location(0)]] color: vec4<f32>) -> [[location(0)]] vec4<f32> {
          return color;
        }
      `,
    }),
    entryPoint: 'main',
    targets: [
      {
        format: 'bgra8unorm',
      },
    ],
  },
  primitiveState: {
    topology: 'triangle-list',
    stripIndexFormat: 'uint16',
  },
});

// Création du buffer de vertices
const vertexBuffer = device.createBuffer({
  size: 4 * 4 * 3,
  usage: 'vertex',
  mappedAtCreation: true,
});

// Création du buffer d'indices
const indexBuffer = device.createBuffer({
  size: 3 * 2,
  usage: 'index',
  mappedAtCreation: true,
});

// Boucle principale du jeu
function render() {
  // Mise à jour des buffers
  vertexBuffer.setSubData(0, new Float32Array([
    -1, -1, 0, 1,
    1, -1, 0, 1,
    0, 1, 0, 1,
  ]));
  indexBuffer.setSubData(0, new Uint16Array([0, 1, 2]));

  // Rendu de la scène
  const commandEncoder = device.createCommandEncoder();
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        loadValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: 'store',
        view: swapChain.getCurrentTexture().createView(),
      },
    ],
  });
  renderPass.setPipeline(pipeline);
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.setIndexBuffer(indexBuffer, 'uint16');
  renderPass.drawIndexed(3);
  renderPass.endPass();
  device.queue.submit([commandEncoder.finish()]);
  requestAnimationFrame(render);
}

render();
