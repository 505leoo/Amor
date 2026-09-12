import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GameErrorState } from './GameStates';
import { gameColors } from '../theme/gameTheme';

export default class AppErrorBoundary extends React.Component {
  state = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary]', error, info?.componentStack);
  }

  reset = () => {
    this.setState(previous => ({ error: null, resetKey: previous.resetKey + 1 }));
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      const errorDetail = this.state.error?.message || String(this.state.error);
      return <View style={styles.root}><GameErrorState title="Esta pantalla tropezó" message="No se perdió tu progreso. Puedes regresar al inicio y continuar jugando." errorDetail={`Error: ${errorDetail}`} onRetry={this.reset} /></View>;
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: gameColors.parchmentMuted },
});
