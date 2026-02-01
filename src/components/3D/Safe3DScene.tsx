import React from 'react';
import SceneErrorBoundary from './SceneErrorBoundary';

interface Safe3DSceneProps {
  sceneName: 'Hero' | 'Mining' | 'Oil' | 'Agriculture';
  fallback?: React.ReactNode;
}

const Safe3DScene: React.FC<Safe3DSceneProps> = ({ sceneName, fallback }) => {
  const [SceneComponent, setSceneComponent] = React.useState<React.ComponentType | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const loadScene = async () => {
      try {
        let Component: React.ComponentType;
        switch (sceneName) {
          case 'Hero':
            Component = (await import('./Hero3DScene')).default;
            break;
          case 'Mining':
            Component = (await import('./Mining3DScene')).default;
            break;
          case 'Oil':
            Component = (await import('./Oil3DScene')).default;
            break;
          case 'Agriculture':
            Component = (await import('./Agriculture3DScene')).default;
            break;
          default:
            throw new Error(`Unknown scene: ${sceneName}`);
        }
        setSceneComponent(() => Component);
      } catch (err) {
        console.error(`Failed to load ${sceneName}3DScene:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    loadScene();
  }, [sceneName]);

  if (error) {
    return fallback || (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-gray-400 text-sm">
          3D Scene unavailable
        </div>
      </div>
    );
  }

  if (!SceneComponent) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-gray-400 text-sm">
          Loading 3D scene...
        </div>
      </div>
    );
  }

  return (
    <SceneErrorBoundary fallback={fallback}>
      <SceneComponent />
    </SceneErrorBoundary>
  );
};

export default Safe3DScene;
