import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Componente de teclado simple
const SimpleKeyboard = ({ onKeyPress }) => {
	const letters = ['q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m'];
	const numbers = ['1','2','3','4','5','6','7','8','9','0'];
	
	return (
		<View style={styles.keyboard}>
			<View style={styles.keyRow}>
				{numbers.map(key => (
					<TouchableOpacity key={key} style={styles.key} onPress={() => onKeyPress(key)}>
						<Text style={styles.keyText}>{key}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.keyRow}>
				{letters.slice(0,10).map(key => (
					<TouchableOpacity key={key} style={styles.key} onPress={() => onKeyPress(key)}>
						<Text style={styles.keyText}>{key}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.keyRow}>
				{letters.slice(10,19).map(key => (
					<TouchableOpacity key={key} style={styles.key} onPress={() => onKeyPress(key)}>
						<Text style={styles.keyText}>{key}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.keyRow}>
				{letters.slice(19).map(key => (
					<TouchableOpacity key={key} style={styles.key} onPress={() => onKeyPress(key)}>
						<Text style={styles.keyText}>{key}</Text>
					</TouchableOpacity>
				))}
				<TouchableOpacity style={[styles.key, styles.deleteKey]} onPress={() => onKeyPress('DELETE')}>
					<Text style={styles.keyText}>⌫</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default function Register({ navigation }) {
	const navigateToScreen = navigation?.navigate || (() => {});
	const [step, setStep] = useState(1);
	const [emailPrefix, setEmailPrefix] = useState('');
	const [password, setPassword] = useState('');
	const [nombre, setNombre] = useState('');
	const [edad, setEdad] = useState('');
	const [dia, setDia] = useState('');
	const [mes, setMes] = useState('');
	const [ano, setAno] = useState('');
	const [genero, setGenero] = useState('');
	const [emailError, setEmailError] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const [nombreError, setNombreError] = useState('');
	const [edadError, setEdadError] = useState('');
	const [fechaError, setFechaError] = useState('');
	const [showPassword, setShowPassword] = useState(true);
	const [showKeyboard, setShowKeyboard] = useState(true);
	const [isCheckingEmail, setIsCheckingEmail] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
	const [registrationSuccess, setRegistrationSuccess] = useState(false);

	const validateEmailPrefix = (prefix) => {
		const p = String(prefix).trim();
		if (!p) return 'Por favor ingresa tu correo.';
		if (p.length < 4) return 'El correo debe tener al menos 4 caracteres.';
		return '';
	};

	const validatePassword = (pwd) => {
		if (!pwd) return 'Por favor ingresa una contraseña.';
		if (pwd.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
		return '';
	};

	const validateNombre = (name) => {
		if (!name.trim()) return 'Por favor ingresa tu nombre.';
		if (name.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
		return '';
	};

	const validateEdad = (age) => {
		const ageNum = parseInt(age);
		if (!age) return 'Por favor ingresa tu edad.';
		if (ageNum < 13 || ageNum > 99) return 'Debes tener entre 13 y 99 años.';
		return '';
	};

	const validateFecha = () => {
		if (!dia || !mes || !ano) return 'Por favor completa la fecha.';
		if (ano.length !== 4) return 'El año debe tener 4 dígitos.';
		const d = parseInt(dia), m = parseInt(mes), a = parseInt(ano);
		if (d < 1 || d > 31) return 'Día inválido.';
		if (m < 1 || m > 12) return 'Mes inválido.';
		if (a < 1900 || a > new Date().getFullYear()) return 'Año inválido.';
		return '';
	};

	const handleKeyPress = (key) => {
		if (key === 'DELETE') {
			if (step === 1) {
				setEmailPrefix(prev => prev.slice(0, -1));
			} else if (step === 2) {
				setPassword(prev => prev.slice(0, -1));
			} else if (step === 3) {
				setNombre(prev => prev.slice(0, -1));
			} else if (step === 4) {
				setEdad(prev => prev.slice(0, -1));
			} else if (step === 5) {
				if (ano.length > 0) setAno(prev => prev.slice(0, -1));
				else if (mes.length > 0) setMes(prev => prev.slice(0, -1));
				else if (dia.length > 0) setDia(prev => prev.slice(0, -1));
			}
		} else {
			if (step === 1) {
				setEmailPrefix(prev => prev + key);
			} else if (step === 2) {
				setPassword(prev => prev + key);
			} else if (step === 3) {
				setNombre(prev => prev + key);
			} else if (step === 4 && /\d/.test(key) && edad.length < 2) {
				setEdad(prev => prev + key);
			} else if (step === 5 && /\d/.test(key)) {
				if (dia.length < 2) setDia(prev => prev + key);
				else if (mes.length < 2) setMes(prev => prev + key);
				else if (ano.length < 4) setAno(prev => prev + key);
			}
		}
	};

	const handleNextStep = async () => {
		if (step === 1) {
			const error = validateEmailPrefix(emailPrefix);
			if (error) {
				setEmailError(error);
				return;
			}
			
			const email = `${emailPrefix.trim()}@gmail.com`;
			setIsCheckingEmail(true);
			
			try {
				const methods = await fetchSignInMethodsForEmail(auth, email);
				if (methods && methods.length > 0) {
					setEmailError('Este correo ya está registrado.');
					setIsCheckingEmail(false);
					return;
				}
			} catch (e) {
				setEmailError('No se pudo verificar el correo. Intenta de nuevo.');
				setIsCheckingEmail(false);
				return;
			}
			
			setIsCheckingEmail(false);
			setEmailError('');
			setStep(2);
		} else if (step === 2) {
			const error = validatePassword(password);
			if (error) {
				setPasswordError(error);
				return;
			}
			setPasswordError('');
			setStep(3);
		} else if (step === 3) {
			const error = validateNombre(nombre);
			if (error) {
				setNombreError(error);
				return;
			}
			setNombreError('');
			setStep(4);
		} else if (step === 4) {
			const error = validateEdad(edad);
			if (error) {
				setEdadError(error);
				return;
			}
			setEdadError('');
			setStep(5);
		} else if (step === 5) {
			const error = validateFecha();
			if (error) {
				setFechaError(error);
				return;
			}
			setFechaError('');
			setStep(6);
		}
	};

	const handleRegister = async () => {
		if (isRegistering) return;
		setIsRegistering(true);
		
		const email = `${emailPrefix.trim()}@gmail.com`;
		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;

			await setDoc(doc(db, 'usuarios', user.uid), {
				correo: email,
				nombre: nombre.trim(),
				edad: parseInt(edad),
				fechaNacimiento: `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`,
				genero: genero,
				fechaRegistro: new Date().toISOString(),
				ultimaConexion: new Date().toISOString(),
				estado: 'activo',
				pareja: null,
				themeColor: '#ffffff',
				dinero: 0,
				nivel: 1,
				exp: 0,
				racha: 1,
				ultimaActividad: new Date().toISOString(),
				fechaUltimaRacha: new Date().toISOString(),
				ownedStickers: []
			});
			
			// Marcar registro como exitoso
			setRegistrationSuccess(true);
			
			// Navegación exitosa - NO resetear isRegistering para evitar que vuelva
			setTimeout(() => {
				if (navigation && navigation.navigate) {
					navigation.navigate('intro');
				}
			}, 500);
			
		} catch (error) {
			setIsRegistering(false);
			console.error('Error en registro:', error);
			
			// No volver al paso 1, mostrar error en el paso actual
			if (error && error.code === 'auth/email-already-in-use') {
				setEmailError('Este correo ya está registrado.');
			} else {
				setPasswordError('Error al registrarte. Intenta de nuevo.');
			}
		}
	};

	return (
		<View style={styles.backgroundImage}>
			<StatusBar hidden={true} />
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity 
						onPress={() => step === 1 ? navigateToScreen('login') : setStep(step - 1)} 
						style={[styles.registerButton, (registrationSuccess || isRegistering) && styles.disabledButton]}
						disabled={registrationSuccess || isRegistering}
					>
						<Text style={[styles.registerText, (registrationSuccess || isRegistering) && styles.disabledText]}>
							{step === 1 ? 'Logearse' : 'Atrás'}
						</Text>
					</TouchableOpacity>
					{step < 6 && (
						<TouchableOpacity 
							onPress={handleNextStep} 
							style={[styles.continueButton, 
								(step === 1 && emailPrefix.length >= 4) ||
								(step === 2 && password.length >= 6) ||
								(step === 3 && nombre.length >= 2) ||
								(step === 4 && edad.length > 0) ||
								(step === 5 && dia && mes && ano.length === 4)
								? styles.continueButtonActive : null]}
							disabled={step === 1 && isCheckingEmail}
						>
							<Text style={[styles.continueText, 
								(step === 1 && emailPrefix.length >= 4) ||
								(step === 2 && password.length >= 6) ||
								(step === 3 && nombre.length >= 2) ||
								(step === 4 && edad.length > 0) ||
								(step === 5 && dia && mes && ano.length === 4)
								? styles.continueTextActive : null]}>Continuar</Text>
						</TouchableOpacity>
					)}
					{step === 6 && (
						<TouchableOpacity 
							onPress={handleRegister} 
							style={[styles.continueButton, styles.registerButton, genero && styles.continueButtonActive]}
							disabled={isRegistering || !genero || registrationSuccess}
						>
							<Text style={[styles.continueText, genero && styles.continueTextActive]}>
								{registrationSuccess ? '¡Registro exitoso!' : isRegistering ? 'Registrando...' : 'Registrarse'}
							</Text>
						</TouchableOpacity>
					)}
				</View>

				{step === 1 && (
					<View style={styles.stepContainer}>
						<Text style={styles.title}>¿Cuál es tu correo?</Text>
						<Text style={styles.description}>Ingresa tu correo para crear tu cuenta.</Text>
						<TouchableOpacity style={styles.emailContainer}>
							<Text style={styles.emailPrefix}>{emailPrefix}</Text>
							<Text style={styles.emailSuffix}>@gmail.com</Text>
						</TouchableOpacity>
						{emailError ? (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>✖ {emailError}</Text>
							</View>
						) : null}
						<SimpleKeyboard onKeyPress={handleKeyPress} />
					</View>
				)}

				{step === 2 && (
					<View style={styles.stepContainer}>
						<Text style={styles.title}>Crea tu contraseña</Text>
						<Text style={styles.description}>Crea una contraseña segura para tu cuenta.</Text>
						<TouchableOpacity style={styles.passwordRow}>
							<Text style={styles.passwordDisplay}>{showPassword ? password : '•'.repeat(password.length)}</Text>
							<TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
								<Icon name={showPassword ? 'visibility' : 'visibility-off'} size={22} color={showPassword ? '#007bff' : '#888'} />
							</TouchableOpacity>
						</TouchableOpacity>
						{passwordError ? (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>✖ {passwordError}</Text>
							</View>
						) : null}
						<SimpleKeyboard onKeyPress={handleKeyPress} />
					</View>
				)}

				{step === 3 && (
					<View style={styles.stepContainer}>
						<Text style={styles.title}>¿Cómo te llamas?</Text>
						<Text style={styles.description}>Ingresa tu nombre para personalizar tu experiencia.</Text>
						<View style={styles.inputContainer}>
							<Text style={styles.inputText}>{nombre}</Text>
						</View>
						{nombreError ? (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>✖ {nombreError}</Text>
							</View>
						) : null}
						<SimpleKeyboard onKeyPress={handleKeyPress} />
					</View>
				)}

				{step === 4 && (
					<View style={styles.stepContainer}>
						<Text style={styles.title}>¿Cuántos años tienes?</Text>
						<Text style={styles.description}>Necesitamos tu edad para ofrecerte contenido apropiado.</Text>
						<View style={styles.inputContainer}>
							<Text style={styles.inputText}>{edad} años</Text>
						</View>
						{edadError ? (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>✖ {edadError}</Text>
							</View>
						) : null}
						<SimpleKeyboard onKeyPress={handleKeyPress} />
					</View>
				)}

				{step === 5 && (
					<View style={styles.stepContainer}>
						<Text style={styles.title}>Fecha de nacimiento</Text>
						<Text style={styles.description}>Ingresa tu fecha de nacimiento (DD/MM/AAAA).</Text>
						<View style={styles.fechaContainer}>
							<View style={styles.fechaInput}>
								<Text style={styles.fechaLabel}>Día</Text>
								<Text style={styles.fechaValue}>{dia || '--'}</Text>
							</View>
							<Text style={styles.fechaSeparator}>/</Text>
							<View style={styles.fechaInput}>
								<Text style={styles.fechaLabel}>Mes</Text>
								<Text style={styles.fechaValue}>{mes || '--'}</Text>
							</View>
							<Text style={styles.fechaSeparator}>/</Text>
							<View style={styles.fechaInput}>
								<Text style={styles.fechaLabel}>Año</Text>
								<Text style={styles.fechaValue}>{ano || '----'}</Text>
							</View>
						</View>
						{fechaError ? (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>✖ {fechaError}</Text>
							</View>
						) : null}
						<SimpleKeyboard onKeyPress={handleKeyPress} />
					</View>
				)}

				{step === 6 && (
					<View style={styles.stepContainer}>
						<Text style={styles.title}>¿Cuál es tu género?</Text>
						<Text style={styles.description}>Selecciona la opción que mejor te represente.</Text>
						<View style={styles.generoContainer}>
							<TouchableOpacity 
								style={[styles.generoOption, genero === 'masculino' && styles.generoSelected]}
								onPress={() => setGenero('masculino')}
							>
								<Text style={[styles.generoText, genero === 'masculino' && styles.generoTextSelected]}>Masculino</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								style={[styles.generoOption, genero === 'femenino' && styles.generoSelected]}
								onPress={() => setGenero('femenino')}
							>
								<Text style={[styles.generoText, genero === 'femenino' && styles.generoTextSelected]}>Femenino</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								style={[styles.generoOption, genero === 'otro' && styles.generoSelected]}
								onPress={() => setGenero('otro')}
							>
								<Text style={[styles.generoText, genero === 'otro' && styles.generoTextSelected]}>Otro</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	backgroundImage: {
		flex: 1,
		backgroundColor: '#fff',
	},
	container: {
		flex: 1,
		justifyContent: 'flex-start',
		alignItems: 'center',
		paddingVertical: 5,
	},
	header: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 25,
		paddingVertical: 2,
		marginBottom: 5,
	},
	registerButton: {
		backgroundColor: '#f0f0f0',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 15,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	registerText: {
		color: '#666',
		fontSize: 13,
		fontWeight: '500',
	},
	continueButton: {
		backgroundColor: '#ddd',
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderRadius: 20,
		marginTop: 15,
	},
	continueButtonActive: {
		backgroundColor: '#007bff',
	},
	continueText: {
		color: '#888',
		fontSize: 14,
		fontWeight: '600',
	},
	continueTextActive: {
		color: '#fff',
	},
	stepContainer: {
		width: '100%',
		alignItems: 'center',
		marginTop: -17,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 0,
		textAlign: 'center',
		color: '#333',
	},
	description: {
		fontSize: 13,
		color: '#666',
		textAlign: 'center',
		marginBottom: 5,
		paddingHorizontal: 18,
		lineHeight: 16,
	},
	emailContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '80%',
		backgroundColor: '#f8f8f8',
		marginBottom: 2,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#eee',
	},
	emailContainerFocused: {
		borderColor: '#007bff',
		backgroundColor: '#fff',
	},
	emailPrefix: {
		flex: 1,
		padding: 8,
		fontSize: 16,
	},
	emailSuffix: {
		padding: 8,
		color: '#666',
		fontSize: 16,
	},
	passwordRow: {
		width: '80%',
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 2,
		backgroundColor: '#f8f8f8',
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#eee',
	},
	passwordRowFocused: {
		borderColor: '#007bff',
		backgroundColor: '#fff',
	},
	passwordDisplay: {
		flex: 1,
		padding: 10,
		fontSize: 16,
	},
	eyeButton: {
		marginLeft: 8,
		padding: 8,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorContainer: {
		width: '80%',
		backgroundColor: '#fff0f0',
		borderColor: '#ff4d4d',
		borderWidth: 1,
		borderRadius: 8,
		paddingVertical: 7,
		paddingHorizontal: 8,
		marginTop: 6,
		marginBottom: 4,
	},
	errorText: {
		color: '#b00020',
		fontSize: 13,
		fontWeight: '600',
	},
	keyboard: {
		width: '100%',
		marginTop: 2,
		paddingHorizontal: 10,
	},
	keyRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 4,
	},
	key: {
		backgroundColor: '#f0f0f0',
		padding: 8,
		margin: 2,
		borderRadius: 4,
		minWidth: 28,
		alignItems: 'center',
	},
	keyText: {
		fontSize: 14,
		color: '#333',
	},
	deleteKey: {
		backgroundColor: '#ff6b6b',
	},
	inputContainer: {
		width: '80%',
		backgroundColor: '#f8f8f8',
		marginBottom: 2,
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#eee',
		alignItems: 'center',
	},
	inputText: {
		fontSize: 16,
		color: '#333',
	},
	fechaContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	fechaInput: {
		backgroundColor: '#f8f8f8',
		borderWidth: 1,
		borderColor: '#eee',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		alignItems: 'center',
		minWidth: 60,
	},
	fechaLabel: {
		fontSize: 10,
		color: '#666',
		marginBottom: 2,
	},
	fechaValue: {
		fontSize: 16,
		color: '#333',
		fontWeight: '600',
	},
	fechaSeparator: {
		fontSize: 18,
		color: '#666',
		marginHorizontal: 8,
	},
	generoContainer: {
		width: '80%',
		gap: 12,
	},
	generoOption: {
		backgroundColor: '#f8f8f8',
		borderWidth: 1,
		borderColor: '#eee',
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 16,
		alignItems: 'center',
	},
	generoSelected: {
		backgroundColor: '#007bff',
		borderColor: '#007bff',
	},
	generoText: {
		fontSize: 16,
		color: '#333',
		fontWeight: '500',
	},
	generoTextSelected: {
		color: '#fff',
		fontWeight: '600',
	},
	registerButton: {
		paddingHorizontal: 20,
		paddingVertical: 12,
		minHeight: 48,
		justifyContent: 'center',
		alignItems: 'center',
	},
	disabledButton: {
		opacity: 0.5,
	},
	disabledText: {
		color: '#999',
	},
});