import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  // Estados de Sesión
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(localStorage.getItem('jwt'))
  const [cuentas, setCuentas] = useState([])
  const [error, setError] = useState('')

  // Estados de Transferencia
  const [destino, setDestino] = useState('')
  const [monto, setMonto] = useState('')

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', { email, password })
      const jwt = response.data
      localStorage.setItem('jwt', jwt)
      setToken(jwt)
    } catch (err) {
      setError("Credenciales incorrectas o servidor apagado")
    }
  }

  const logout = () => {
    localStorage.removeItem('jwt')
    setToken(null)
    setCuentas([])
    setEmail('')
    setPassword('')
  }

  const cargarCuentas = () => {
    if (token) {
      axios.get('http://localhost:8080/api/accounts/me')
        .then(res => setCuentas(res.data))
        .catch(err => { if(err.response && err.response.status === 403) logout() })
    }
  }

  // --- EFECTO: CARGAR SALDO AL ENTRAR ---
  useEffect(() => {
    if (token) {
      // FORMA BLINDADA: Enviamos el header manualmente aquí
      axios.get('http://localhost:8080/api/accounts/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        setCuentas(response.data)
      })
      .catch(err => {
        console.error("Error cargando cuentas", err)
        // Solo cerramos sesión si el error es REALMENTE de autenticación
        if(err.response && (err.response.status === 403 || err.response.status === 401)) {
            // Comentamos el logout automático para que puedas ver el error en consola si persiste
            // logout() 
            alert("Tu sesión expiró o el token no es válido.")
        }
      })
    }
  }, [token])

  // --- LÓGICA DE TRANSFERENCIA ---
  const handleTransfer = async (e) => {
    e.preventDefault()
    if(cuentas.length === 0) return alert("No tienes cuenta origen")

    try {
      // Usamos la primera cuenta del usuario como origen
      const origenId = cuentas[0].id 
      
      await axios.post('http://localhost:8080/api/transactions/transfer', {
        sourceAccountId: origenId,
        targetAccountId: destino, // El usuario escribe el ID destino (Ej: 2)
        amount: monto
      })
      
      alert("✅ ¡Transferencia Exitosa!")
      setMonto('')
      cargarCuentas() // Recargar saldo automáticamente
      
    } catch (err) {
      console.error(err)
      alert("❌ Error: " + (err.response?.data || "Verifica los datos"))
    }
  }

  // --- PANTALLA PRINCIPAL ---
  if (token) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{margin: 0}}>🏦 Mi Banco</h1>
          <button onClick={logout} style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>Salir</button>
        </div>

        {/* TARJETAS DE SALDO */}
        {cuentas.map(cta => (
          <div key={cta.id} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <p style={{ opacity: 0.8, fontSize: '12px', margin: 0 }}>CUENTA AHORRO (ID: {cta.id})</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0' }}>$ {cta.balance}</p>
            <p style={{ fontSize: '14px', letterSpacing: '2px', margin: 0 }}>**** **** {cta.accountNumber.slice(-4)}</p>
          </div>
        ))}

        {/* FORMULARIO DE TRANSFERENCIA */}
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
          <h3 style={{marginTop: 0, color: '#333'}}>💸 Nueva Transferencia</h3>
          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            <label style={{fontSize: '12px', color: '#666'}}>ID Cuenta Destino (Ej: 2)</label>
            <input 
              type="number" 
              placeholder="ID Destino" 
              value={destino} 
              onChange={e => setDestino(e.target.value)} 
              required 
              style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}}
            />

            <label style={{fontSize: '12px', color: '#666'}}>Monto a transferir</label>
            <input 
              type="number" 
              placeholder="$ 0.00" 
              value={monto} 
              onChange={e => setMonto(e.target.value)} 
              required 
              min="1"
              style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}}
            />

            <button type="submit" style={{ padding: '12px', backgroundColor: '#48bb78', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
              Confirmar Transferencia
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- LOGIN ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px', fontFamily: 'Arial' }}>
      <h1>🔐 Acceso Clientes</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }}/>
        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }}/>
        {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}
        <button type="submit" style={{ padding: '12px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Ingresar</button>
      </form>
    </div>
  )
}

export default App