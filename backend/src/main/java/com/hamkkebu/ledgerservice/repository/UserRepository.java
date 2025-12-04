package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.ledgerservice.data.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUserIdAndIsDeletedFalse(Long userId);

    Optional<User> findByUsernameAndIsDeletedFalse(String username);

    boolean existsByUserIdAndIsDeletedFalse(Long userId);

    @Query("SELECT MAX(u.userId) FROM User u")
    Optional<Long> findMaxUserId();
}
