import { Functor } from "../utils/Functor.js";
import { ValidationError } from '../utils/customError.js';
import { PlayerModel } from '../models/player.js';

const validateName = name =>
    new Functor(name)
        .map(n => n && n.trim())
        .map(n => n && n.length >= 3 && n.length <= 30 ? n : null)
        .getValue();

const validateAge = age =>
    new Functor(age)
        .map(a => Number(a))
        .map(a => a >= 13 && a <= 120 ? a : null)
        .getValue();

const validateEmail = email =>
    new Functor(email)
        .map(e => e && e.trim().toLowerCase())
        .map(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null)
        .getValue();

const validatePassword = password =>
    new Functor(password)
        .map(p => p && p.trim())
        .map(p => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(p) ? p : null)
        .getValue();

const validatePlayerData = (data) => {
    const { name, email, age, password } = data;
    const errors = [];

    const validatedName = validateName(name);
    if (!validatedName) errors.push('Name must be between 3 and 30 characters');

    const validatedEmail = validateEmail(email);
    if (!validatedEmail) errors.push('Valid email is required');

    const validatedAge = validateAge(age);
    if (!validatedAge) errors.push('Age must be between 13 and 120');

    const validatedPassword = validatePassword(password);
    if (!validatedPassword) errors.push('Password must be at least 8 characters and contain letters and numbers');

    if (errors.length) {
        throw new ValidationError(errors.join(', '));
    }

    return {
        name: validatedName,
        email: validatedEmail,
        age: validatedAge,
        password: validatedPassword
    };
};

const validateUniqueEmail = async (email) => {
    const existingPlayer = await PlayerModel.getByEmail(email);
    return new Functor(existingPlayer)
        .map(player => player ? null : email)
        .map(validEmail => {
            if (!validEmail) throw new ValidationError('Email already exists');
            return validEmail;
        })
        .getValue();
};

export default {
    validatePlayerData,
    validateUniqueEmail,
};
