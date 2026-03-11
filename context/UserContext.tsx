import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // A função de logout agora vive no contexto.
  // Sua única responsabilidade é limpar o estado do usuário.
  const logout = () => {
    setUser(null);
  };

  // Exponha a nova função de logout junto com o estado do usuário e a função setUser.
  // setUser ainda é necessário para o processo de login.
  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
