package com.cab.booking.config;

import com.cab.booking.security.AppUserDetailsService;
import com.cab.booking.security.JwtAuthFilter;
import com.cab.booking.security.JwtService;
import com.cab.booking.security.RateLimitFilter;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService,
                                           AppUserDetailsService userDetailsService,
                                           AppProperties props) throws Exception {
        JwtAuthFilter jwtFilter = new JwtAuthFilter(jwtService, userDetailsService);
        RateLimitFilter rateLimitFilter = new RateLimitFilter(props.rateLimit().authPerMinute());

        http
            .csrf(csrf -> csrf.disable())                       // stateless API with Bearer tokens, no cookies
            .cors(Customizer.withDefaults())                    // uses the CorsConfigurationSource bean below
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**", "/actuator/health", "/actuator/health/**", "/error").permitAll()
                .requestMatchers("/ws/**").permitAll()                         // STOMP CONNECT is authenticated separately
                .requestMatchers(HttpMethod.POST, "/api/payments/webhook").permitAll() // verified by Stripe signature
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/drivers/me", "/api/drivers/me/**").hasRole("DRIVER")
                .requestMatchers(HttpMethod.GET, "/api/rides/available").hasRole("DRIVER")
                .requestMatchers(HttpMethod.POST,
                        "/api/rides/*/accept", "/api/rides/*/decline", "/api/rides/*/arrived",
                        "/api/rides/*/start", "/api/rides/*/complete").hasRole("DRIVER")
                .requestMatchers(HttpMethod.POST, "/api/rides", "/api/rides/estimate", "/api/rides/*/cancel").hasRole("RIDER")
                .requestMatchers("/api/payments/**").hasRole("RIDER")
                .requestMatchers(HttpMethod.POST, "/api/ratings").hasRole("RIDER")
                .anyRequest().authenticated())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(401);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"status\":401,\"message\":\"Authentication required\"}");
                })
                .accessDeniedHandler((req, res, ex) -> {
                    res.setStatus(403);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"status\":403,\"message\":\"You do not have access to this resource\"}");
                }))
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(props.cors().allowedOrigins());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        cfg.setAllowCredentials(false);
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
