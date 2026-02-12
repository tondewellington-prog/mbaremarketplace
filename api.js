

// Auth

async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    console.error(error);
    alert("Registration failed: " + error.message);
    return null;
  }

  alert("Check your email to confirm!");
  return data;
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    console.error(error);
    alert("Login failed: " + error.message);
    return null;
  }

  return data;
}

// Orders example
async function createOrder(orderData) {
  const { data, error } = await supabase
    .from("orders")
    .insert([orderData]);

  if (error) {
    console.error(error);
    alert("Order failed: " + error.message);
  }

  return data;
}
