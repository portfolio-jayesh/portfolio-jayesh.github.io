# Superconducting CPW design and TiN microwave modelling

**Ongoing research-adjacent modelling · IIT Bombay**  
[← Research index](../../README.md) · [Portfolio](https://portfolio-jayesh.github.io/#projects)

## Question

How do coplanar waveguide (CPW) dimensions and superconducting thin-film properties affect impedance and microwave propagation?

## Modelling approach

- Start with **conformal-mapping estimates** to choose center-conductor width and slot spacing for a nominal **50 Ω** CPW.
- Study **TiN thin-film sheet impedance and kinetic inductance**: a superconductor can store extra magnetic/kinetic energy in the motion of Cooper pairs.
- Use **Ansys HFSS** for electromagnetic modelling of CPW geometry, fields and microwave response.
- Consider how superconducting boundaries differ from a perfect electric conductor (PEC) model.

## Key physics

The CPW characteristic impedance is approximately `Z₀ = √(L'/C')`. For a superconducting line, the inductance per unit length includes a **kinetic contribution**, so geometry-only normal-metal estimates need additional care.

## Status

Design and model development. **No publicly released validated S-parameters, cryogenic loss measurements or full simulation files** are claimed here. This project summary is intentionally scoped to the workflow and physical questions.

See also the related [indium interconnect work](../indium-flip-chip/README.md).
